'use client';

import { WorkflowAnalysis } from '@/types/workflow';
import { 
  Network, 
  Clock, 
  Tag, 
  Zap, 
  Settings, 
  FileText,
  ExternalLink,
  Copy,
  Download,
  Globe,
  Database,
  Mail,
  MessageSquare,
  ShoppingCart,
  Code,
  Calendar,
  BarChart,
  Users,
  Smartphone,
  Server,
  Cloud,
  Search,
  PieChart,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useState } from 'react';

interface WorkflowCardProps {
  workflow: WorkflowAnalysis;
  onView?: (workflow: WorkflowAnalysis) => void;
  onCopy?: (workflow: WorkflowAnalysis) => void;
  onDownload?: (workflow: WorkflowAnalysis, format: 'n8n' | 'analysis') => void;
  onVote?: (workflow: WorkflowAnalysis, vote: 'up' | 'down' | null) => void;
}

const categoryIcons = {
  'Automation': Zap,
  'Data Processing': Database,
  'Integration': Network,
  'Monitoring': BarChart,
  'Communication': MessageSquare,
  'Marketing': PieChart,
  'Development': Code,
  'Business Process': Users,
  'E-commerce': ShoppingCart,
  'Content Management': FileText,
  'Analytics': Search,
  'API': Globe,
  'Email': Mail,
  'Calendar': Calendar,
  'Mobile': Smartphone,
  'Cloud': Cloud,
  'Server': Server
};

const categoryColors = {
  'Automation': 'from-blue-500 to-cyan-500',
  'Data Processing': 'from-purple-500 to-pink-500',
  'Integration': 'from-green-500 to-emerald-500',
  'Monitoring': 'from-yellow-500 to-orange-500',
  'Communication': 'from-cyan-500 to-blue-500',
  'Marketing': 'from-pink-500 to-rose-500',
  'Development': 'from-indigo-500 to-purple-500',
  'Business Process': 'from-orange-500 to-red-500',
  'E-commerce': 'from-emerald-500 to-green-500',
  'Content Management': 'from-violet-500 to-purple-500'
};

const complexityColors = {
  Simple: 'text-green-400 bg-green-500/10 border-green-500/20',
  Medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Complex: 'text-red-400 bg-red-500/10 border-red-500/20'
};

export function WorkflowCard({ workflow, onView, onCopy, onDownload, onVote }: WorkflowCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(workflow.userVote || null);
  const [upvotes, setUpvotes] = useState(workflow.upvotes || 0);
  const [downvotes, setDownvotes] = useState(workflow.downvotes || 0);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
    setShowModal(true);
  };

  const handleMouseLeave = () => {
    setShowModal(false);
  };

  const handleView = () => {
    onView?.(workflow);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy?.(workflow);
  };

  const handleDownload = (e: React.MouseEvent, format: 'n8n' | 'analysis' = 'n8n') => {
    e.stopPropagation();
    onDownload?.(workflow, format);
  };

  const handleVote = (e: React.MouseEvent, vote: 'up' | 'down') => {
    e.stopPropagation();
    
    // Update vote counts based on state change
    if (userVote === vote) {
      // Remove vote
      if (vote === 'up') setUpvotes(upvotes - 1);
      else setDownvotes(downvotes - 1);
      setUserVote(null);
      onVote?.(workflow, null);
    } else {
      // Change or add vote
      if (userVote === 'up') setUpvotes(upvotes - 1);
      else if (userVote === 'down') setDownvotes(downvotes - 1);
      
      if (vote === 'up') setUpvotes(upvotes + (userVote ? 0 : 1));
      else setDownvotes(downvotes + (userVote ? 0 : 1));
      
      setUserVote(vote);
      onVote?.(workflow, vote);
    }
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Globe;
    return IconComponent;
  };

  const getCategoryGradient = (category: string): string => {
    return categoryColors[category as keyof typeof categoryColors] || 'from-gray-500 to-gray-600';
  };

  const IconComponent = getCategoryIcon(workflow.category);
  const netRating = upvotes - downvotes;

  return (
    <>
      {/* Main Card */}
      <div
        className="relative group cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleView}
      >
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:shadow-xl hover:shadow-black/30">
          {/* Icon Header with Rating */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getCategoryGradient(workflow.category)} flex items-center justify-center shadow-lg`}>
                <IconComponent className="w-7 h-7 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">
                  {workflow.category}
                </span>
                <div className={`text-xs px-2 py-0.5 rounded-full border inline-flex self-start mt-1 ${complexityColors[workflow.complexity]}`}>
                  {workflow.complexity}
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 leading-snug">
            {workflow.name}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed mb-4">
            {workflow.description}
          </p>

          {/* Stats and Rating */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Network className="w-3 h-3" />
                <span>{workflow.nodeCount} nodes</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>{workflow.triggers.length} triggers</span>
              </div>
            </div>
          </div>

          {/* Rating Buttons */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-800">
            <button
              onClick={(e) => handleVote(e, 'up')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                userVote === 'up' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-green-400 border border-gray-700/50'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm font-medium">{upvotes}</span>
            </button>
            
            <button
              onClick={(e) => handleVote(e, 'down')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                userVote === 'down' 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-red-400 border border-gray-700/50'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span className="text-sm font-medium">{downvotes}</span>
            </button>

            <div className="ml-auto">
              <span className={`text-sm font-semibold ${
                netRating > 0 ? 'text-green-400' : 
                netRating < 0 ? 'text-red-400' : 
                'text-gray-400'
              }`}>
                {netRating > 0 ? '+' : ''}{netRating}
              </span>
            </div>
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
        </div>
      </div>

      {/* Hover Modal */}
      {showModal && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: Math.min(mousePosition.x + 20, window.innerWidth - 360),
            top: Math.min(mousePosition.y - 100, window.innerHeight - 400),
            maxWidth: '340px'
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-md border border-gray-600/50 rounded-xl p-5 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-left-2 duration-200">
            {/* Modal Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCategoryGradient(workflow.category)} flex items-center justify-center flex-shrink-0`}>
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-white line-clamp-2 leading-tight mb-1">
                  {workflow.name}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {workflow.category}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${complexityColors[workflow.complexity]}`}>
                    {workflow.complexity}
                  </span>
                </div>
              </div>
            </div>

            {/* Rating Display */}
            <div className="flex items-center gap-3 mb-3 p-2 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-1 text-green-400">
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm font-medium">{upvotes}</span>
              </div>
              <div className="flex items-center gap-1 text-red-400">
                <ThumbsDown className="w-4 h-4" />
                <span className="text-sm font-medium">{downvotes}</span>
              </div>
              <div className="ml-auto">
                <span className={`text-base font-bold ${
                  netRating > 0 ? 'text-green-400' : 
                  netRating < 0 ? 'text-red-400' : 
                  'text-gray-400'
                }`}>
                  Score: {netRating > 0 ? '+' : ''}{netRating}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-300 line-clamp-4 leading-relaxed mb-4">
              {workflow.description}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 bg-gray-800/30 rounded-lg">
                <div className="text-white text-base font-medium">{workflow.nodeCount}</div>
                <div className="text-gray-400 text-xs">Nodes</div>
              </div>
              <div className="text-center p-2 bg-gray-800/30 rounded-lg">
                <div className="text-white text-base font-medium">{workflow.triggers.length}</div>
                <div className="text-gray-400 text-xs">Triggers</div>
              </div>
              <div className="text-center p-2 bg-gray-800/30 rounded-lg">
                <div className="text-white text-base font-medium">{workflow.integrations.length}</div>
                <div className="text-gray-400 text-xs">Integrations</div>
              </div>
            </div>

            {/* Integrations Preview */}
            {workflow.integrations.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-2">Integrations:</div>
                <div className="flex flex-wrap gap-1">
                  {workflow.integrations.slice(0, 4).map((integration, index) => (
                    <span
                      key={index}
                      className="bg-gray-800/50 text-gray-300 px-2 py-1 rounded text-xs"
                    >
                      {integration}
                    </span>
                  ))}
                  {workflow.integrations.length > 4 && (
                    <span className="text-xs text-gray-400">
                      +{workflow.integrations.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Import Tag */}
            {workflow.importTags && (
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-2">Import Source:</div>
                <div className="flex items-center gap-2">
                  <Database className="w-3 h-3 text-blue-400" />
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs border border-blue-500/30">
                    {workflow.importTags}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(e);
                }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white text-sm rounded-lg transition-colors pointer-events-auto"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button
                onClick={(e) => handleDownload(e, 'n8n')}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white text-sm rounded-lg transition-colors pointer-events-auto"
              >
                <Download className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleView();
                }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600/80 hover:bg-green-500 text-white text-sm rounded-lg transition-colors pointer-events-auto"
              >
                <ExternalLink className="w-4 h-4" />
                Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}