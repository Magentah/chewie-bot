import BotServer from './botServer';
import { IConfig } from './config';

if (process.argv[2] !== 'test') {
    const server = new BotServer();
    server.start(process.env.NODE_ENV === 'development' ? 3001 : 3000);
} else {
    // unit testing
}
