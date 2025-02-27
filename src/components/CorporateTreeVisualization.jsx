import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Home, ChevronDown, ChevronRight } from 'lucide-react';

// Simple UI components to replace the imports from external libraries
const Card = ({ children, className }) => (
  <div className={`card ${className || ''}`}>{children}</div>
);

const CardHeader = ({ children }) => (
  <div className="card-header">{children}</div>
);

const CardTitle = ({ children }) => (
  <h2 className="card-title">{children}</h2>
);

const CardContent = ({ children }) => (
  <div className="card-content">{children}</div>
);

const Alert = ({ children, variant }) => (
  <div className={`alert ${variant ? `alert-${variant}` : ''}`}>{children}</div>
);

const AlertTitle = ({ children }) => (
  <div className="alert-title">{children}</div>
);

const AlertDescription = ({ children }) => (
  <div className="alert-description">{children}</div>
);

const CorporateTreeVisualization = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [error, setError] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});
  
  // Load and process the JSON data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Modified to use fetch instead of window.fs.readFile
        const response = await fetch('./data/FINARVEDI_SPA_430881755_FFT.json');
        const fileData = await response.text();
        
        const parsedData = JSON.parse(fileData);
        
        if (parsedData[0]?.familyTreeMembers) {
          setData(parsedData[0]);
          processTreeData(parsedData[0].familyTreeMembers);
        } else {
          setError('Invalid data format');
        }
      } catch (err) {
        setError('Error loading data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Process the tree data to create a hierarchical structure
  const processTreeData = (members) => {
    // Create a map of DUNS to node for quick access
    const nodesMap = {};
    
    // Initialize nodes
    members.forEach(member => {
      nodesMap[member.duns] = {
        ...member,
        children: [],
        level: member.corporateLinkage?.hierarchyLevel || 0,
        parent: member.corporateLinkage?.parent?.duns || null
      };
    });
    
    // Build the tree structure
    const rootNodes = [];
    
    Object.values(nodesMap).forEach(node => {
      // If node has a parent and the parent exists in our map
      if (node.parent && nodesMap[node.parent]) {
        nodesMap[node.parent].children.push(node);
      } else if (node.level === 1) {
        // This is a root node (Global Ultimate)
        rootNodes.push(node);
      }
    });
    
    // Sort children by revenue (if available) or by name
    Object.values(nodesMap).forEach(node => {
      node.children.sort((a, b) => {
        const aRevenue = a.financials?.[0]?.yearlyRevenues?.[0]?.value || 0;
        const bRevenue = b.financials?.[0]?.yearlyRevenues?.[0]?.value || 0;
        return bRevenue - aRevenue || (a.primaryName || '').localeCompare(b.primaryName || '');
      });
    });
    
    // Initialize expanded state - root nodes are always expanded
    const initialExpandedState = {};
    rootNodes.forEach(node => {
      initialExpandedState[node.duns] = true;
    });
    
    setExpandedNodes(initialExpandedState);
    setProcessedData({ rootNodes, nodesMap });
  };
  
  // Toggle node expansion
  const toggleNodeExpansion = (duns, e) => {
    e.stopPropagation(); // Prevent node selection when clicking the expand button
    
    setExpandedNodes(prev => ({
      ...prev,
      [duns]: !prev[duns]
    }));
  };
  
  // Reset view to default
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  
  // Handle zoom in/out
  const handleZoom = (factor) => {
    setZoom(prev => {
      const newZoom = prev + factor;
      return Math.min(Math.max(0.5, newZoom), 2);
    });
  };
  
  // Start dragging
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  // Handle dragging
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan(prev => ({
        x: prev.x + (e.clientX - dragStart.x),
        y: prev.y + (e.clientY - dragStart.y)
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  // End dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Format currency values
  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Recursive function to render the tree nodes
  const renderTreeNode = (node, x, y, width, isRoot = false) => {
    if (!node) return null;
    
    // Calculate node dimensions and colors
    const revenue = node.financials?.[0]?.yearlyRevenues?.[0]?.value || 0;
    const maxRevenue = 3000000000; // 3 billion € benchmark for color intensity
    
    // Calculate color intensity based on revenue
    const intensity = Math.min(1, revenue / maxRevenue);
    const blueValue = Math.floor(220 - intensity * 170);
    const backgroundColor = revenue > 0 
      ? `rgb(${blueValue}, ${blueValue}, 255)` 
      : '#e0e0e0';
    
    // Calculate node size based on revenue (with min/max constraints)
    const minNodeWidth = 200;
    const maxNodeWidth = 320;
    const revenueBasedWidth = revenue > 0
      ? minNodeWidth + Math.min(revenue / 25000000, 1) * (maxNodeWidth - minNodeWidth)
      : minNodeWidth;
    
    const nodeWidth = Math.min(width, revenueBasedWidth);
    const nodeHeight = 70;
    
    // Determine if node should be expanded
    const isExpanded = !!expandedNodes[node.duns];
    const childCount = node.children?.length || 0;
    const hasCollapsibleChildren = childCount > 5 && !isRoot;
    const shouldShowExpandIcon = hasCollapsibleChildren || (childCount > 0 && !isRoot);
    
    // Determine which children to display
    let displayedChildren = node.children || [];
    if (!isExpanded && hasCollapsibleChildren) {
      displayedChildren = displayedChildren.slice(0, 5);
    }
    
    // Calculate child node layout
    const childY = y + nodeHeight + 100; // Increased vertical spacing
    
    // Spread children out more horizontally based on number of visible children
    // The more children, the wider we spread them
    const childSpread = Math.max(1.5, 2.5 - (displayedChildren.length * 0.1));
    const childWidth = (width * childSpread) / Math.max(1, displayedChildren.length);
    
    // Center point for the whole group of children
    const childrenCenterX = x;
    
    // Calculate name display - truncate if needed
    const displayName = node.primaryName?.length > 25
      ? node.primaryName.substring(0, 22) + '...'
      : node.primaryName || 'Unknown';
    
    // Display revenue/employees
    const revenueText = revenue > 0 
      ? formatCurrency(revenue) 
      : '';
    
    const employeesText = node.numberOfEmployees?.[0]?.value 
      ? `${node.numberOfEmployees[0].value} employees`
      : '';
    
    return (
      <g key={node.duns}>
        {/* Node box */}
        <rect
          x={x - nodeWidth / 2}
          y={y}
          width={nodeWidth}
          height={nodeHeight}
          rx={8}
          ry={8}
          fill={backgroundColor}
          stroke="#333"
          strokeWidth={1.5}
          cursor="pointer"
          onClick={() => setSelectedNode(node)}
        />
        
        {/* Node text */}
        <text
          x={x}
          y={y + 25}
          textAnchor="middle"
          fill="#000"
          fontSize={15}
          fontWeight="bold"
          cursor="pointer"
          onClick={() => setSelectedNode(node)}
        >
          {displayName}
        </text>
        
        {/* Revenue/Employees (if available) */}
        <text
          x={x}
          y={y + 50}
          textAnchor="middle"
          fill="#333"
          fontSize={13}
          cursor="pointer"
          onClick={() => setSelectedNode(node)}
        >
          {revenueText}
          {revenueText && employeesText ? ' | ' : ''}
          {employeesText}
        </text>
        
        {/* Hidden children indicator */}
        {childCount > 0 && (
          <g 
            transform={`translate(${x + nodeWidth/2 - 30}, ${y + nodeHeight - 15})`}
            onClick={(e) => toggleNodeExpansion(node.duns, e)}
            cursor="pointer"
          >
            <circle cx="12" cy="12" r="12" fill="white" stroke="#333" />
            {isExpanded ? 
              <ChevronDown x="6" y="6" width="12" height="12" /> :
              <ChevronRight x="6" y="6" width="12" height="12" />
            }
          </g>
        )}
        
        {/* Number of hidden children indicator */}
        {hasCollapsibleChildren && !isExpanded && (
          <text
            x={x}
            y={y + nodeHeight + 30}
            textAnchor="middle"
            fill="#666"
            fontSize={13}
            fontStyle="italic"
          >
            +{childCount - 5} more subsidiaries
          </text>
        )}
        
        {/* Draw the branches from parent to children */}
        {isExpanded && displayedChildren.map((child, index) => {
          // Calculate position for each child
          // Distribute children evenly around the center point
          const totalWidth = displayedChildren.length * childWidth;
          const startX = childrenCenterX - totalWidth / 2 + childWidth / 2;
          const childX = startX + (index * childWidth);
          
          return (
            <g key={`edge-${node.duns}-${child.duns}`}>
              <line
                x1={x}
                y1={y + nodeHeight}
                x2={childX}
                y2={childY}
                stroke="#555"
                strokeWidth={1.5}
                cursor="pointer"
                onClick={() => setSelectedNode({
                  parent: node,
                  child: child,
                  type: 'relationship'
                })}
              />
              {renderTreeNode(child, childX, childY, childWidth)}
            </g>
          );
        })}
      </g>
    );
  };
  
  // Render details sidebar for selected node
  const renderDetailsPanel = () => {
    if (!selectedNode) return null;
    
    // Handle relationship click vs node click
    if (selectedNode.type === 'relationship') {
      const parent = selectedNode.parent;
      const child = selectedNode.child;
      
      return (
        <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-lg border-l border-gray-200 overflow-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Corporate Relationship</h3>
            <button 
              className="text-gray-500 hover:text-gray-700" 
              onClick={() => setSelectedNode(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4">
            <h4 className="font-medium text-blue-600">Parent Company</h4>
            <p className="font-bold">{parent.primaryName}</p>
            <p className="text-sm text-gray-600 mb-4">DUNS: {parent.duns}</p>
            
            <h4 className="font-medium text-blue-600">Subsidiary</h4>
            <p className="font-bold">{child.primaryName}</p>
            <p className="text-sm text-gray-600 mb-4">DUNS: {child.duns}</p>
            
            <h4 className="font-medium text-blue-600">Relationship Type</h4>
            <p className="mb-4">
              {child.corporateLinkage?.familytreeRolesPlayed?.map(role => role.description).join(', ') || 'Direct subsidiary'}
            </p>
            
            <h4 className="font-medium text-blue-600">Hierarchical Level</h4>
            <p>Level {child.level}</p>
          </div>
        </div>
      );
    }
    
    // Node details
    const node = selectedNode;
    const revenue = node.financials?.[0]?.yearlyRevenues?.[0]?.value;
    const employees = node.numberOfEmployees?.[0]?.value;
    const address = node.primaryAddress;
    
    return (
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-lg border-l border-gray-200 overflow-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Company Details</h3>
          <button 
            className="text-gray-500 hover:text-gray-700" 
            onClick={() => setSelectedNode(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <h2 className="text-xl font-bold mb-1">{node.primaryName}</h2>
          
          {node.tradeStyleNames && node.tradeStyleNames.length > 0 && (
            <p className="text-gray-600 italic mb-4">
              Also known as: {node.tradeStyleNames.map(n => n.name).join(', ')}
            </p>
          )}
          
          <p className="text-sm text-gray-600 mb-4">DUNS: {node.duns}</p>
          
          <h4 className="font-medium text-blue-600">Corporate Role</h4>
          <p className="mb-4">
            {node.corporateLinkage?.familytreeRolesPlayed?.map(role => role.description).join(', ') || 'N/A'}
          </p>
          
          <h4 className="font-medium text-blue-600">Industry</h4>
          <p className="mb-4">
            {node.primaryIndustryCode?.usSicV4Description || 'N/A'} 
            {node.primaryIndustryCode?.usSicV4 && ` (SIC: ${node.primaryIndustryCode.usSicV4})`}
          </p>
          
          {address && (
            <>
              <h4 className="font-medium text-blue-600">Address</h4>
              <p className="mb-1">{address.streetAddress?.line1}</p>
              {address.streetAddress?.line2 && <p className="mb-1">{address.streetAddress.line2}</p>}
              <p className="mb-1">
                {address.postalCode} {address.addressLocality?.name}, {address.addressRegion?.name}
              </p>
              <p className="mb-4">{address.addressCountry?.name}</p>
            </>
          )}
          
          <h4 className="font-medium text-blue-600">Financial Information</h4>
          <p className="mb-1">Annual Revenue: {revenue ? formatCurrency(revenue) : 'N/A'}</p>
          <p className="mb-4">Employees: {employees || 'N/A'}</p>
          
          <h4 className="font-medium text-blue-600">Established</h4>
          <p className="mb-4">{node.startDate || 'N/A'}</p>
          
          {node.hierarchyLevel && (
            <>
              <h4 className="font-medium text-blue-600">Hierarchy Level</h4>
              <p className="mb-4">Level {node.hierarchyLevel}</p>
            </>
          )}
          
          {node.parent && processedData?.nodesMap[node.parent] && (
            <>
              <h4 className="font-medium text-blue-600">Parent Company</h4>
              <p className="font-medium">{processedData.nodesMap[node.parent].primaryName}</p>
              <p className="text-sm text-gray-600 mb-4">DUNS: {node.parent}</p>
            </>
          )}
          
          {node.children && node.children.length > 0 && (
            <>
              <h4 className="font-medium text-blue-600">
                Subsidiaries 
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({node.children.length})
                </span>
                
                {/* Toggle expansion button for the details panel */}
                <button 
                  className="ml-2 text-sm text-blue-600 hover:text-blue-800"
                  onClick={(e) => toggleNodeExpansion(node.duns, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {expandedNodes[node.duns] ? 
                    <span className="flex items-center"><ChevronDown size={14} className="mr-1" /> Collapse</span> : 
                    <span className="flex items-center"><ChevronRight size={14} className="mr-1" /> Expand</span>
                  }
                </button>
              </h4>
              
              {expandedNodes[node.duns] && (
                <ul className="list-disc pl-5 mb-4">
                  {node.children.map(child => (
                    <li key={child.duns} className="mb-1">
                      <span 
                        className="cursor-pointer hover:text-blue-600"
                        onClick={() => setSelectedNode(child)}
                      >
                        {child.primaryName}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    );
  };
  
  // Main render function for the component
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading Corporate Family Tree...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please wait while the corporate structure data is being loaded and processed.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!processedData || !processedData.rootNodes.length) {
    return (
      <Alert>
        <AlertTitle>No Data Available</AlertTitle>
        <AlertDescription>Could not find any corporate structure data to display.</AlertDescription>
      </Alert>
    );
  }
  
  // Calculate dimensions for SVG - larger to accommodate the expanded layout
  const rootNode = processedData.rootNodes[0];
  const totalNodes = Object.keys(processedData.nodesMap).length;
  const svgWidth = Math.max(2000, totalNodes * 60);
  const svgHeight = rootNode.level * 600;
  
  // Calculate transform for panning/zooming
  const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;
  
  return (
    <div className="w-full h-full relative" style={{ backgroundColor: '#f5f8fa' }}>
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button 
          onClick={() => handleZoom(0.1)}
          className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
          title="Zoom In"
          style={{ border: 'none', cursor: 'pointer' }}
        >
          <ZoomIn size={20} />
        </button>
        <button 
          onClick={() => handleZoom(-0.1)}
          className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
          title="Zoom Out"
          style={{ border: 'none', cursor: 'pointer' }}
        >
          <ZoomOut size={20} />
        </button>
        <button 
          onClick={resetView}
          className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
          title="Reset View"
          style={{ border: 'none', cursor: 'pointer' }}
        >
          <Home size={20} />
        </button>
      </div>
      
      <div 
        className="w-full h-full overflow-hidden cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          <g transform={transform}>
            {processedData.rootNodes.map(node => 
              renderTreeNode(node, svgWidth / 2, 50, svgWidth * 0.8, true)
            )}
          </g>
        </svg>
      </div>
      
      {renderDetailsPanel()}
      
      <div 
        className="absolute bottom-4 left-4 z-10 text-sm text-gray-600 bg-white p-2 rounded shadow-md"
        style={{ maxWidth: '250px' }}
      >
        <p className="font-medium">FINARVEDI SPA Corporate Tree</p>
        <p>{totalNodes} companies in group</p>
        <p>Click on nodes for details</p>
        <p style={{ display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={12} style={{ marginRight: '4px' }} /> 
          Toggle to expand/collapse
        </p>
      </div>
    </div>
  );
};

export default CorporateTreeVisualization;