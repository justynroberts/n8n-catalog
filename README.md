# n8n Workflow Catalog

A sleek, dark-themed web application for cataloging and analyzing n8n workflows using AI. Built with Next.js 14, TypeScript, and Tailwind CSS with an Uber-inspired design aesthetic.

## Features

### 🚀 Core Functionality
- **Drag & Drop Upload**: Upload single JSON files or entire directories
- **AI-Powered Analysis**: Uses OpenAI GPT-3.5-turbo to analyze and categorize workflows
- **Smart Caching**: Avoids re-analyzing unchanged workflows
- **Dual View Modes**: Switch between grid cards and searchable data table
- **Advanced Filtering**: Filter by category, complexity, tags, and search terms

### 🎨 Design Features
- **Dark Uber-Style Theme**: Modern dark interface with Space Grotesk font
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Smooth Animations**: Hover effects, loading states, and transitions
- **Web Icons**: Clean Lucide React icons throughout

### 🧠 AI Analysis
- **Automatic Categorization**: Sorts workflows into logical categories
- **Complexity Assessment**: Rates workflows as Simple, Medium, or Complex
- **Smart Tagging**: Generates relevant tags for easy discovery
- **Integration Detection**: Identifies third-party services and APIs
- **Runtime Estimation**: Predicts workflow execution time

### 📊 Workflow Intelligence
- **Node Analysis**: Extracts and counts all node types
- **Dependency Mapping**: Identifies credentials and external dependencies
- **Trigger Detection**: Finds webhook, cron, and manual triggers
- **Integration Catalog**: Lists all connected services

## Quick Start

### 🐳 Docker (Recommended)

**Prerequisites**: Docker and Docker Compose

```bash
# Clone the repository
git clone <repository-url>
cd n8n-catalog

# Start with Docker Compose
docker-compose up -d

# Or run the container directly
docker run -d \
  --name n8n-catalog \
  -p 3000:3000 \
  -v n8n-catalog-data:/app/data \
  n8n-catalog:latest
```

**Access**: http://localhost:3000

### 💻 Local Development

**Prerequisites**: Node.js 18+, OpenAI API key (for AI analysis)

```bash
# Clone the repository
cd n8n-catalog

# Install dependencies
npm install

# Start development server
npm run dev
```

### Setup
1. Open http://localhost:3000
2. Click "Settings" to add your OpenAI API key
3. Upload your n8n workflow JSON files via drag-and-drop
4. Use Database Manager to import/export your workflow collection

## Usage

### Uploading Workflows
- **Single Files**: Drag JSON files onto the upload zone
- **Bulk Upload**: Drag entire directories containing workflow files
- **Browse**: Click "Select Files" or "Select Directory" buttons
- **Database Import**: Use Database Manager to import complete workflow collections

### Viewing Results
- **Grid View**: Visual cards with workflow summaries and individual export
- **Table View**: Sortable data table with detailed information
- **Search**: Advanced filtering with tags, categories, and complexity
- **Export**: Download individual workflows or complete database backups

### Database Management
- **Persistent Storage**: SQLite database with full workflow data preservation
- **Import/Export**: Complete database backup and restore functionality
- **Individual Export**: Save workflows directly from the UI as n8n-ready JSON
- **Data Recovery**: Resume interrupted imports and maintain data integrity

### AI Analysis
Each workflow gets automatically analyzed for:
- **Description**: What the workflow does
- **Category**: Business function (Automation, Integration, etc.)
- **Tags**: Searchable keywords
- **Use Case**: When to use this workflow
- **Complexity**: Development difficulty
- **Dependencies**: Required services and credentials

## Technical Stack

- **Framework**: Next.js 14 with App Router and standalone output
- **Language**: TypeScript with strict type checking
- **Database**: SQLite with better-sqlite3 for persistent storage
- **Styling**: Tailwind CSS with glass-morphism Uber-style theme
- **AI**: OpenAI GPT-3.5-turbo API for workflow analysis
- **Container**: Docker with Alpine Linux and multi-stage builds
- **Icons**: Lucide React icon library
- **Font**: Space Grotesk from Google Fonts

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   ├── file-upload.tsx     # Drag & drop file upload
│   ├── workflow-card.tsx   # Grid view cards with export
│   ├── workflow-table.tsx  # Data table view
│   ├── database-manager.tsx # Database import/export UI
│   └── advanced-search.tsx # Search and filtering
├── lib/                 # Core utilities
│   ├── ai-analyzer.ts      # OpenAI integration
│   ├── file-scanner.ts     # File processing
│   ├── sqlite-processor.ts # Background import processing
│   ├── workflow-parser.ts  # n8n JSON parsing
│   └── db/sqlite.ts        # Database operations
├── contexts/            # React contexts
│   └── import-progress-context.tsx # Import progress state
└── types/               # TypeScript definitions
    └── workflow.ts         # Core workflow interfaces
```

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint

# Docker commands
docker build -t n8n-catalog .
docker run -p 3000:3000 -v n8n-catalog-data:/app/data n8n-catalog
```

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Optional for AI analysis, can be set in UI
- `DATABASE_PATH`: SQLite database location (default: `/app/data/workflows.db`)
- `NODE_ENV`: Environment mode (development/production)
- `PORT`: Server port (default: 3000)

### Docker Volumes
- `/app/data`: Persistent storage for SQLite database
- Mount this volume to preserve data between container restarts

### Storage
- **Database**: SQLite database with full workflow data persistence
- **Import Progress**: Background processing with progress tracking
- **Export Formats**: Complete database backups and individual n8n JSON files

### Customization
- Modify `tailwind.config.js` for theme colors
- Update `src/lib/ai-analyzer.ts` for different AI models
- Extend workflow parser for custom n8n node types

## Browser Support

- Chrome/Edge: Full support including directory uploads
- Firefox: Full support except directory uploads (uses file selection fallback)
- Safari: Full support with file selection

## Performance

- **Lazy Loading**: Components load on demand
- **Caching**: Analyzed workflows cached locally
- **Batch Processing**: Multiple files processed efficiently
- **Memory Management**: Automatic cleanup of old data

## Security

- API keys stored securely in localStorage
- No server-side data storage
- Client-side only processing
- No workflow data sent to external services (except OpenAI for analysis)

## Deployment

### Production Docker Build
```bash
# Build production image
docker build -t n8n-catalog:latest .

# Run with persistent data
docker run -d \
  --name n8n-catalog \
  -p 3000:3000 \
  -v n8n-catalog-data:/app/data \
  -e OPENAI_API_KEY=your-key-here \
  n8n-catalog:latest

# Health check
curl http://localhost:3000/api/health
```

### Docker Compose
```yaml
version: '3.8'
services:
  n8n-catalog:
    image: n8n-catalog:latest
    ports:
      - "3000:3000"
    volumes:
      - n8n-catalog-data:/app/data
    environment:
      - OPENAI_API_KEY=your-key-here
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 3s
      retries: 3

volumes:
  n8n-catalog-data:
```

## Troubleshooting

### Container Issues
- **Build fails**: Ensure Docker has sufficient disk space (5GB+)
- **Native modules**: better-sqlite3 rebuilds automatically during container build
- **Permission errors**: Container runs as non-root user (nextjs:nodejs)
- **Health check fails**: Check if port 3000 is accessible inside container

### Database Issues
- **Import progress stuck**: Check `/app/data/workflows.db` permissions
- **Large imports**: May take several minutes, monitor container logs
- **Corrupted database**: Delete volume and recreate: `docker volume rm n8n-catalog-data`

### Common Issues
- **API Key**: Set OpenAI API key in Settings or environment variable
- **File Format**: Only JSON files from n8n exports are supported
- **Memory Usage**: Large workflow collections require adequate container memory
- **Search Performance**: Index rebuilds automatically on startup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the GitHub issues
- Review the troubleshooting section
- Create a new issue with detailed information

---

Built with ❤️ for the n8n community