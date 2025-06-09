// Custom SVG Transformer for React Native
const { transform } = require('@svgr/core');
const fs = require('fs');

// This is a function that will be used by Metro to transform SVG files
module.exports = {
  process(src, filename, config, options) {
    try {
      // Read the SVG file
      const svgCode = fs.readFileSync(filename, 'utf8');
      
      // Transform SVG to React Native component
      const jsCode = transform.sync(
        svgCode,
        {
          plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
          native: true,
          dimensions: true,
          svgProps: {
            width: '{width}',
            height: '{height}',
          },
          // Ensure proper React Native compatibility
          expandProps: 'end',
          replaceAttrValues: {
            '#000': '{props.fill || "#000"}',
            '#000000': '{props.fill || "#000000"}',
            black: '{props.fill || "black"}',
          },
        },
        { componentName: 'SvgComponent' }
      );
      
      // Return the transformed code with proper error handling
      return {
        code: `
          ${jsCode}
          
          // Add fallback in case of rendering issues
          const FallbackComponent = (props) => {
            return null; // Render nothing if SVG fails
          };
          
          // Export with error boundary
          module.exports = (props) => {
            try {
              return SvgComponent(props);
            } catch (error) {
              console.warn('SVG rendering error:', error);
              return FallbackComponent(props);
            }
          };
        `,
      };
    } catch (error) {
      console.error('SVG transformation error:', error);
      // Return a fallback component if transformation fails
      return {
        code: `
          const FallbackComponent = () => null;
          module.exports = FallbackComponent;
        `,
      };
    }
  },
};
