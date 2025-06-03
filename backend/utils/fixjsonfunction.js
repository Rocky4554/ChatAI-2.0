/**
 * Fixes invalid JSON and returns valid JSON
 * Handles various JSON errors like extra brackets, missing quotes, trailing commas, etc.
 * @param {string} invalidJson - The invalid JSON string to fix
 * @returns {string} - Valid JSON string or throws error if unfixable
 */
 /**
* Robust JSON fixer specifically designed for JSON containing code content
* Handles nested JSON strings with code, quotes, and special characters
*/
export function fixJsonWithCodeContent(jsonString) {
 if (!jsonString || typeof jsonString !== 'string') {
   throw new Error('Input must be a non-empty string');
 }

 // First, try to parse as-is
 try {
   const parsed = JSON.parse(jsonString);
   return JSON.stringify(parsed, null, 2);
 } catch (e) {
   // Continue with fixing
 }

 let fixed = jsonString.trim();
 
 // Step 1: Fix the most common issue - unescaped quotes in string values
 fixed = escapeQuotesInStringValues(fixed);
 
 // Step 2: Fix trailing commas
 fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
 
 // Step 3: Fix extra closing brackets
 fixed = removeExtraClosingBrackets(fixed);
 
 // Step 4: Add missing closing brackets
 fixed = addMissingClosingBrackets(fixed);
 
 // Try to parse again
 try {
   const parsed = JSON.parse(fixed);
   return JSON.stringify(parsed, null, 2);
 } catch (error) {
   // If still failing, try more aggressive fixes
   return tryAggressiveFixes(fixed);
 }
}

/**
* Escape quotes in string values while preserving JSON structure
*/
function escapeQuotesInStringValues(json) {
 const tokens = tokenizeJson(json);
 let result = '';
 
 for (let i = 0; i < tokens.length; i++) {
   const token = tokens[i];
   
   if (token.type === 'string' && token.isValue) {
     // This is a string value, escape internal quotes
     let content = token.value.slice(1, -1); // Remove surrounding quotes
     
     // Escape any unescaped quotes inside
     content = content
       .replace(/\\"/g, '__ESCAPED_QUOTE__') // Temporarily replace already escaped quotes
       .replace(/"/g, '\\"')                 // Escape unescaped quotes
       .replace(/__ESCAPED_QUOTE__/g, '\\"') // Restore escaped quotes
       .replace(/\n/g, '\\n')               // Escape newlines
       .replace(/\r/g, '\\r')               // Escape carriage returns
       .replace(/\t/g, '\\t');              // Escape tabs
     
     result += '"' + content + '"';
   } else {
     result += token.value;
   }
 }
 
 return result;
}

/**
* Simple JSON tokenizer to identify string values vs structure
*/
function tokenizeJson(json) {
 const tokens = [];
 let i = 0;
 
 while (i < json.length) {
   const char = json[i];
   
   if (char === '"') {
     // Found a string
     const stringResult = extractString(json, i);
     const isValue = isStringValue(json, i);
     
     tokens.push({
       type: 'string',
       value: stringResult.value,
       isValue: isValue
     });
     
     i = stringResult.endIndex + 1;
   } else if (/\s/.test(char)) {
     // Skip whitespace
     i++;
   } else {
     // Other characters (brackets, commas, etc.)
     tokens.push({
       type: 'symbol',
       value: char,
       isValue: false
     });
     i++;
   }
 }
 
 return tokens;
}

/**
* Extract a complete string from JSON starting at given index
*/
function extractString(json, startIndex) {
 let i = startIndex + 1; // Skip opening quote
 let value = '"';
 let escapeNext = false;
 
 while (i < json.length) {
   const char = json[i];
   value += char;
   
   if (escapeNext) {
     escapeNext = false;
   } else if (char === '\\') {
     escapeNext = true;
   } else if (char === '"') {
     // Found closing quote
     return { value, endIndex: i };
   }
   
   i++;
 }
 
 // If we reach here, string wasn't properly closed
 return { value: value + '"', endIndex: i - 1 };
}

/**
* Check if a string at given position is a value (not a property name)
*/
function isStringValue(json, stringIndex) {
 // Look backwards to see if there's a colon before this string
 let i = stringIndex - 1;
 while (i >= 0 && /\s/.test(json[i])) {
   i--; // Skip whitespace
 }
 
 return i >= 0 && json[i] === ':';
}

/**
* Remove extra closing brackets
*/
function removeExtraClosingBrackets(json) {
 const stack = [];
 let result = '';
 let inString = false;
 let escapeNext = false;
 
 for (let i = 0; i < json.length; i++) {
   const char = json[i];
   
   if (escapeNext) {
     result += char;
     escapeNext = false;
     continue;
   }
   
   if (char === '\\') {
     result += char;
     escapeNext = true;
     continue;
   }
   
   if (char === '"') {
     inString = !inString;
     result += char;
     continue;
   }
   
   if (!inString) {
     if (char === '{' || char === '[') {
       stack.push(char);
       result += char;
     } else if (char === '}') {
       if (stack.length > 0 && stack[stack.length - 1] === '{') {
         stack.pop();
         result += char;
       }
       // Ignore extra closing braces
     } else if (char === ']') {
       if (stack.length > 0 && stack[stack.length - 1] === '[') {
         stack.pop();
         result += char;
       }
       // Ignore extra closing brackets
     } else {
       result += char;
     }
   } else {
     result += char;
   }
 }
 
 return result;
}

/**
* Add missing closing brackets
*/
function addMissingClosingBrackets(json) {
 const stack = [];
 let inString = false;
 let escapeNext = false;
 
 for (let i = 0; i < json.length; i++) {
   const char = json[i];
   
   if (escapeNext) {
     escapeNext = false;
     continue;
   }
   
   if (char === '\\') {
     escapeNext = true;
     continue;
   }
   
   if (char === '"') {
     inString = !inString;
     continue;
   }
   
   if (!inString) {
     if (char === '{') {
       stack.push('}');
     } else if (char === '[') {
       stack.push(']');
     } else if (char === '}' || char === ']') {
       if (stack.length > 0 && stack[stack.length - 1] === char) {
         stack.pop();
       }
     }
   }
 }
 
 // Add missing closing brackets
 return json + stack.reverse().join('');
}

/**
* Try more aggressive fixes for stubborn JSON
*/
function tryAggressiveFixes(json) {
 try {
   // Try parsing with eval (dangerous but as last resort)
   // DON'T USE THIS IN PRODUCTION - only for development/testing
   const fixed = json
     .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":') // Quote unquoted keys
     .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
     .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
   
   const parsed = JSON.parse(fixed);
   return JSON.stringify(parsed, null, 2);
 } catch (e) {
   throw new Error(`Unable to fix JSON: ${e.message}`);
 }
}

// Test with your specific case
function testYourCase() {
 const testJson = `{"fileTree": {"server.js": {"file": {"contents": "import express from 'express';\\nimport cors from 'cors';\\nimport dotenv from 'dotenv';\\n\\ndotenv.config();\\n\\nconst app = express();\\n\\n// Middleware\\napp.use(cors());\\napp.use(express.json());\\n\\n// Routes\\napp.get('/', (req, res) => {\\n  res.json({ message: 'API Server is running!' });\\n});\\n\\nconst PORT = process.env.PORT || 5000;\\napp.listen(PORT, '0.0.0.0', () => {\\n  console.log(\`Server running on port \${PORT}\`);\\n});"}}}, "package.json": {"file": {"contents": "{\\n  \\"name\\": \\"express-server\\",\\n  \\"version\\": \\"1.0.0\\",\\n  \\"type\\": \\"module\\",\\n  \\"scripts\\": {\\n    \\"dev\\": \\"nodemon server.js\\",\\n    \\"start\\": \\"node server.js\\"\\n  },\\n  \\"dependencies\\": {\\n    \\"cors\\": \\"^2.8.5\\",\\n    \\"dotenv\\": \\"^16.0.3\\",\\n    \\"express\\": \\"^4.18.2\\"\\n  },\\n  \\"devDependencies\\": {\\n    \\"nodemon\\": \\"^2.0.22\\"\\n  }\\n}"}}}}}`;
 
 try {
   const fixed = fixJsonWithCodeContent(testJson);
   console.log('✅ Successfully fixed JSON!');
   console.log('Length:', fixed.length);
   return fixed;
 } catch (error) {
   console.log('❌ Failed to fix JSON:', error.message);
   return null;
 }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
 module.exports = { fixJsonWithCodeContent, testYourCase };
}

// Test the specific case
console.log('Testing your specific JSON case...');
testYourCase();