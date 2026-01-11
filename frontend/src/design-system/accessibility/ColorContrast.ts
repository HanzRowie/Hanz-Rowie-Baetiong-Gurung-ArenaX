/**
 * Color contrast validation utilities
 * WCAG 2.1 AA compliance checking
 */

// Convert hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Calculate relative luminance
const getRelativeLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

// Calculate contrast ratio between two colors
export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Please use hex colors.');
  }
  
  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

// WCAG compliance levels
export const WCAGLevels = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
} as const;

// Check WCAG compliance
export const checkWCAGCompliance = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): { passes: boolean; ratio: number; required: number } => {
  const ratio = getContrastRatio(foreground, background);
  
  let required: number;
  if (level === 'AAA') {
    required = isLargeText ? WCAGLevels.AAA_LARGE : WCAGLevels.AAA_NORMAL;
  } else {
    required = isLargeText ? WCAGLevels.AA_LARGE : WCAGLevels.AA_NORMAL;
  }
  
  return {
    passes: ratio >= required,
    ratio: Math.round(ratio * 100) / 100,
    required,
  };
};

// Generate accessible color variations
export const generateAccessibleVariation = (
  baseColor: string,
  targetBackground: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): string | null => {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return null;
  
  const targetRatio = level === 'AAA' 
    ? (isLargeText ? WCAGLevels.AAA_LARGE : WCAGLevels.AAA_NORMAL)
    : (isLargeText ? WCAGLevels.AA_LARGE : WCAGLevels.AA_NORMAL);
  
  // Try darkening first
  for (let factor = 0.9; factor >= 0.1; factor -= 0.1) {
    const newColor = `#${Math.round(rgb.r * factor).toString(16).padStart(2, '0')}${Math.round(rgb.g * factor).toString(16).padStart(2, '0')}${Math.round(rgb.b * factor).toString(16).padStart(2, '0')}`;
    
    const ratio = getContrastRatio(newColor, targetBackground);
    if (ratio >= targetRatio) {
      return newColor;
    }
  }
  
  // Try lightening if darkening didn't work
  for (let factor = 1.1; factor <= 2; factor += 0.1) {
    const newR = Math.min(255, Math.round(rgb.r * factor));
    const newG = Math.min(255, Math.round(rgb.g * factor));
    const newB = Math.min(255, Math.round(rgb.b * factor));
    
    const newColor = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    
    const ratio = getContrastRatio(newColor, targetBackground);
    if (ratio >= targetRatio) {
      return newColor;
    }
  }
  
  return null;
};

// Color blindness simulation
export const simulateColorBlindness = (
  color: string,
  type: 'protanopia' | 'deuteranopia' | 'tritanopia'
): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  let { r, g, b } = rgb;
  
  // Normalize to 0-1 range
  r /= 255;
  g /= 255;
  b /= 255;
  
  // Apply color blindness transformation matrices
  let newR: number, newG: number, newB: number;
  
  switch (type) {
    case 'protanopia': // Red-blind
      newR = 0.567 * r + 0.433 * g;
      newG = 0.558 * r + 0.442 * g;
      newB = 0.242 * g + 0.758 * b;
      break;
    case 'deuteranopia': // Green-blind
      newR = 0.625 * r + 0.375 * g;
      newG = 0.7 * r + 0.3 * g;
      newB = 0.3 * g + 0.7 * b;
      break;
    case 'tritanopia': // Blue-blind
      newR = 0.95 * r + 0.05 * g;
      newG = 0.433 * g + 0.567 * b;
      newB = 0.475 * g + 0.525 * b;
      break;
    default:
      return color;
  }
  
  // Convert back to 0-255 range and hex
  const finalR = Math.round(Math.max(0, Math.min(255, newR * 255)));
  const finalG = Math.round(Math.max(0, Math.min(255, newG * 255)));
  const finalB = Math.round(Math.max(0, Math.min(255, newB * 255)));
  
  return `#${finalR.toString(16).padStart(2, '0')}${finalG.toString(16).padStart(2, '0')}${finalB.toString(16).padStart(2, '0')}`;
};

// Validate color palette accessibility
export const validateColorPalette = (
  palette: Record<string, string>,
  backgrounds: string[] = ['#ffffff', '#000000']
): Record<string, { color: string; issues: string[]; suggestions: string[] }> => {
  const results: Record<string, { color: string; issues: string[]; suggestions: string[] }> = {};
  
  Object.entries(palette).forEach(([name, color]) => {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    backgrounds.forEach(bg => {
      const compliance = checkWCAGCompliance(color, bg);
      
      if (!compliance.passes) {
        issues.push(`Insufficient contrast against ${bg} (${compliance.ratio}:1, needs ${compliance.required}:1)`);
        
        const suggestion = generateAccessibleVariation(color, bg);
        if (suggestion) {
          suggestions.push(`Use ${suggestion} for better contrast against ${bg}`);
        }
      }
    });
    
    // Check color blindness accessibility
    const colorBlindVariations = [
      simulateColorBlindness(color, 'protanopia'),
      simulateColorBlindness(color, 'deuteranopia'),
      simulateColorBlindness(color, 'tritanopia'),
    ];
    
    const uniqueVariations = [...new Set(colorBlindVariations)];
    if (uniqueVariations.length === 1 && uniqueVariations[0] === color) {
      // Color doesn't change with color blindness simulation - might be problematic
      suggestions.push('Consider adding patterns or textures for color-blind users');
    }
    
    results[name] = {
      color,
      issues,
      suggestions,
    };
  });
  
  return results;
};