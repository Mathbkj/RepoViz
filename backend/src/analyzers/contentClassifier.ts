import fs from 'fs';
import type { NodeType } from '@repo-viz/shared';

interface ContentHint {
  type: NodeType;
  confidence: number;
}

// Pattern tuples: [regex, nodeType, confidence]
const CONTENT_PATTERNS: [RegExp, NodeType, number][] = [
  // Frameworks / decorators (high confidence)
  [/@Controller\s*\(|@RestController/,           'Route',    0.95],
  [/@Injectable\s*\(|@Service\s*\(|@Component\s*\(/,'Service', 0.9],
  [/@Entity\s*\(|@Table\s*\(|@Schema\s*\(/,      'Database', 0.95],
  [/createSlice\s*\(|createReducer\s*\(/,         'Service',  0.8],
  [/mongoose\.Schema|new Schema\s*\(/,             'Database', 0.9],
  [/sequelize\.define|DataTypes\./,               'Database', 0.85],
  [/prisma\.\w+\.(findMany|create|update|delete)/, 'Database', 0.9],
  [/drizzle\s*\(|pgTable\s*\(|sqliteTable\s*\(/,  'Database', 0.9],

  // Express / Fastify / Hono routing
  [/router\.(get|post|put|patch|delete|use)\s*\(/, 'Route',   0.9],
  [/app\.(get|post|put|patch|delete)\s*\(/,        'Route',   0.85],
  [/fastify\.(get|post|put|patch|delete)\s*\(/,    'Route',   0.85],

  // Entry points
  [/app\.listen\s*\(|server\.listen\s*\(/,         'EntryPoint', 0.95],
  [/ReactDOM\.createRoot|ReactDOM\.render\s*\(/,   'EntryPoint', 0.95],
  [/createApp\s*\(|new Vue\s*\(/,                  'EntryPoint', 0.9],
  [/NestFactory\.create\s*\(/,                     'EntryPoint', 0.98],

  // HTTP clients / fetch wrappers
  [/axios\.create\s*\(|new Axios\s*\(/,            'API',     0.85],
  [/fetch\s*\(\s*['"`]http/,                       'API',     0.7],
  [/new GraphQLClient|ApolloClient\s*\(/,           'API',     0.9],

  // UI components
  [/export\s+(?:default\s+)?function\s+[A-Z]\w+\s*\([^)]*\)\s*(?::\s*\w+\s*)?\{[\s\S]{0,200}return\s*\(?\s*</,'Component', 0.8],
  [/export\s+const\s+[A-Z]\w+\s*=\s*(?:memo\(|forwardRef\(|\([^)]*\)\s*=>)/,'Component', 0.75],

  // Config / env
  [/dotenv\.config\s*\(|process\.env\b/,           'Config',  0.65],
  [/module\.exports\s*=\s*\{/,                     'Config',  0.5],

  // Utility
  [/export\s+(?:const|function)\s+(?:use[A-Z]|is[A-Z]|to[A-Z]|from[A-Z]|format[A-Z])/, 'Utility', 0.65],
];

const READ_BYTES = 3000; // Only inspect the first 3 KB

export class ContentClassifier {
  hint(absolutePath: string): ContentHint | null {
    let content: string;
    try {
      const buf = Buffer.allocUnsafe(READ_BYTES);
      const fd = fs.openSync(absolutePath, 'r');
      const bytesRead = fs.readSync(fd, buf, 0, READ_BYTES, 0);
      fs.closeSync(fd);
      content = buf.slice(0, bytesRead).toString('utf8');
    } catch {
      return null;
    }

    let best: ContentHint | null = null;
    for (const [re, type, confidence] of CONTENT_PATTERNS) {
      if (re.test(content)) {
        if (!best || confidence > best.confidence) {
          best = { type, confidence };
        }
      }
    }
    return best;
  }
}
