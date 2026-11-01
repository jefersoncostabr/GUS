import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function isDirectExecution(moduleUrl, argv = process.argv) {
    if (!argv[1]) return false;

    const executedPath = path.resolve(argv[1]);
    const modulePath = fileURLToPath(moduleUrl);
    return process.platform === 'win32'
        ? executedPath.toLowerCase() === modulePath.toLowerCase()
        : executedPath === modulePath;
}
