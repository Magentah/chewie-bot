import BotServer from './botServer';

if (process.argv[2] !== 'test') {
    const server = new BotServer();
    server.start(process.env.NODE_ENV === 'development' ? 3001 : 8081);
} else {
    // unit testing
}
