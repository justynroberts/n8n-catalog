# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an n8n-catalog project for managing n8n workflows, custom nodes, and automation templates. The project serves as a centralized repository for reusable n8n components and workflow patterns.

## Development Commands

### Initial Setup
```bash
# Initialize the project (if not already done)
git init
npm init -y
npm install

# Start local n8n instance
docker-compose up -d

# Access n8n interface
open http://localhost:5678
```

### Common Development Tasks
```bash
# Start development environment
npm run dev

# Build custom nodes
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Export workflows from n8n
npm run export-workflows

# Import workflows to n8n
npm run import-workflows
```

## Project Structure

### Core Directories
- `workflows/` - n8n workflow JSON files organized by category
- `nodes/` - Custom n8n node implementations
- `credentials/` - Custom credential type definitions
- `scripts/` - Utility scripts for workflow management
- `docs/` - Documentation and usage guides

### Workflow Organization
- `workflows/automation/` - General automation workflows
- `workflows/data-processing/` - Data transformation and processing
- `workflows/integrations/` - Third-party service integrations
- `workflows/monitoring/` - System monitoring and alerting

## n8n Development Patterns

### Custom Node Development
- All custom nodes should be in TypeScript
- Follow n8n's node development conventions
- Include proper type definitions and descriptions
- Add comprehensive error handling

### Workflow Best Practices
- Use descriptive names for nodes and workflows
- Add notes and documentation within workflows
- Implement proper error handling paths
- Use environment variables for configuration

### Testing Strategy
- Unit tests for custom nodes using Jest
- Integration tests for complete workflows
- Test workflows with mock data before production
- Validate JSON schema for exported workflows

## Environment Configuration

### Required Environment Variables
```bash
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://localhost:5678/
```

### Docker Setup
- Uses official n8n Docker image
- Persistent data volume for workflows and credentials
- Custom nodes mounted as volumes during development

## Workflow Management

### Export Process
1. Export workflows from n8n UI or API
2. Organize by category in appropriate directories
3. Add metadata files with descriptions and usage
4. Version control all workflow changes

### Import Process
1. Validate workflow JSON structure
2. Check for required credentials and nodes
3. Import using n8n CLI or API
4. Test workflow execution

## Integration Guidelines

### Custom Credentials
- Store credential templates, not actual secrets
- Document required fields and setup instructions
- Use environment variables for sensitive data
- Implement OAuth flows where applicable

### External Services
- Document API requirements and limitations
- Provide example configurations
- Include rate limiting considerations
- Add authentication examples

## Common Issues and Solutions

### Node Dependencies
- Custom nodes require proper package.json setup
- Use n8n-compatible versions of dependencies
- Test nodes in isolation before integration

### Workflow Debugging
- Use n8n's execution history for troubleshooting
- Add debug nodes for complex data transformations
- Log important data points for monitoring

### Performance Considerations
- Optimize data transformations for large datasets
- Use batch processing where appropriate
- Monitor memory usage in long-running workflows
- Implement proper timeout handling

## Development Workflow

1. **Planning**: Document workflow requirements and data flow
2. **Development**: Build and test individual components
3. **Integration**: Combine components into complete workflows
4. **Testing**: Validate with representative data
5. **Documentation**: Update guides and examples
6. **Deployment**: Export and version control changes

## Resource Links

- [n8n Documentation](https://docs.n8n.io/)
- [Custom Node Development](https://docs.n8n.io/integrations/creating-nodes/)
- [Workflow Best Practices](https://docs.n8n.io/workflows/workflows/)
- [API Documentation](https://docs.n8n.io/api/)