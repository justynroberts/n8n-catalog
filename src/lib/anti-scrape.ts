import { NextRequest } from 'next/server';

// Rate limiting storage (in production, use Redis or database)
const rateLimits = new Map<string, { count: number; resetTime: number; blocked: boolean }>();

// Bot detection patterns
const botUserAgents = [
  /bot/i, /crawl/i, /spider/i, /scraper/i, /curl/i, /wget/i,
  /python/i, /requests/i, /urllib/i, /httpx/i, /aiohttp/i,
  /scrapy/i, /beautifulsoup/i, /selenium/i, /playwright/i,
  /puppeteer/i, /headless/i, /phantom/i, /nightmare/i
];

const suspiciousHeaders = [
  'x-requested-with', 'x-forwarded-for', 'x-real-ip',
  'x-scraper', 'x-bot', 'x-crawler'
];

export interface AntiScrapeOptions {
  maxRequests?: number;
  windowMs?: number;
  blockDuration?: number;
  checkUserAgent?: boolean;
  requireJavaScript?: boolean;
}

export function detectBot(req: NextRequest): boolean {
  const userAgent = req.headers.get('user-agent') || '';
  const acceptHeader = req.headers.get('accept') || '';
  
  // Allow health checks and same-origin requests
  if (req.nextUrl.pathname === '/api/health') {
    return false;
  }
  
  // Allow requests from browsers (have referer or accept HTML)
  const referer = req.headers.get('referer');
  if (referer && referer.includes(req.nextUrl.origin)) {
    return false;
  }
  
  if (acceptHeader.includes('text/html')) {
    return false;
  }
  
  // Only block obvious scraping tools
  const obviousBots = [
    /curl/i, /wget/i, /python/i, /requests/i, /scrapy/i, 
    /beautifulsoup/i, /headless/i, /phantom/i
  ];
  
  if (obviousBots.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  // Missing user agent is suspicious
  if (!userAgent) {
    return true;
  }
  
  return false;
}

export function rateLimit(req: NextRequest, options: AntiScrapeOptions = {}): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  reason?: string;
} {
  const {
    maxRequests = 100,
    windowMs = 15 * 60 * 1000, // 15 minutes
    blockDuration = 60 * 60 * 1000, // 1 hour
    checkUserAgent = true
  } = options;
  
  const ip = req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const key = `${ip}-${req.headers.get('user-agent')}`;
  const now = Date.now();
  
  // Bot detection
  if (checkUserAgent && detectBot(req)) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: now + blockDuration,
      reason: 'Bot detected'
    };
  }
  
  const current = rateLimits.get(key) || { count: 0, resetTime: now + windowMs, blocked: false };
  
  // Check if IP is blocked
  if (current.blocked && now < current.resetTime) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
      reason: 'IP blocked'
    };
  }
  
  // Reset window if expired
  if (now > current.resetTime) {
    current.count = 0;
    current.resetTime = now + windowMs;
    current.blocked = false;
  }
  
  current.count++;
  
  // Block if limit exceeded
  if (current.count > maxRequests) {
    current.blocked = true;
    current.resetTime = now + blockDuration;
    rateLimits.set(key, current);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
      reason: 'Rate limit exceeded'
    };
  }
  
  rateLimits.set(key, current);
  
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - current.count),
    resetTime: current.resetTime
  };
}

// Function to clear rate limits (for admin use)
export function clearRateLimits() {
  rateLimits.clear();
  console.log('Rate limits cleared');
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimits.entries());
  for (const [key, data] of entries) {
    if (now > data.resetTime && !data.blocked) {
      rateLimits.delete(key);
    }
  }
}, 10 * 60 * 1000); // Clean every 10 minutes

// Obfuscate sensitive data
export function obfuscateWorkflowData(workflow: any): any {
  return {
    ...workflow,
    // Remove or obfuscate sensitive fields
    nodes: workflow.nodes?.length || 0,
    workflow_data: undefined, // Never expose raw workflow data publicly
    dependencies: workflow.dependencies?.length || 0,
    webhooks: undefined,
    credentials: undefined,
    // Keep only safe display data
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    category: workflow.category,
    tags: workflow.tags,
    complexity: workflow.complexity,
    node_count: workflow.node_count,
    integrations: workflow.integrations,
    use_case: workflow.use_case
  };
}

// Generate JavaScript challenge for browser verification
export function generateJSChallenge(): { challenge: string; solution: string } {
  const a = Math.floor(Math.random() * 100) + 1;
  const b = Math.floor(Math.random() * 100) + 1;
  const operation = ['+', '-', '*'][Math.floor(Math.random() * 3)];
  
  let solution: number;
  switch (operation) {
    case '+': solution = a + b; break;
    case '-': solution = a - b; break;
    case '*': solution = a * b; break;
    default: solution = a + b;
  }
  
  const challenge = `(function(){return ${a} ${operation} ${b};})()`;
  
  return {
    challenge: Buffer.from(challenge).toString('base64'),
    solution: solution.toString()
  };
}

export function verifyJSChallenge(challenge: string, answer: string): boolean {
  try {
    const decoded = Buffer.from(challenge, 'base64').toString();
    // Parse simple arithmetic expression without eval
    const match = decoded.match(/return (\d+) ([+\-*]) (\d+)/);
    if (!match) return false;
    
    const [, a, operator, b] = match;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    
    let result: number;
    switch (operator) {
      case '+': result = numA + numB; break;
      case '-': result = numA - numB; break;
      case '*': result = numA * numB; break;
      default: return false;
    }
    
    return result.toString() === answer;
  } catch {
    return false;
  }
}