import 'reflect-metadata';
import { Container } from 'inversify';
import OAuthService from './services/oauthService';
import DatabaseService from './services/databaseService';
import TwitchService from './services/twitchService';
import CacheService from './services/cacheService';
import YoutubeService from './services/youtubeService';
import CommandService from './services/commandService';
import Users from './database/users';

const botContainer = new Container();

botContainer.bind<OAuthService>(OAuthService).toSelf().inSingletonScope();
botContainer.bind<DatabaseService>(DatabaseService).toSelf().inSingletonScope().onActivation((context, service) => {
    service.initDatabase();
    return service;
});
botContainer.bind<TwitchService>(TwitchService).toSelf().inSingletonScope();
botContainer.bind<CacheService>(CacheService).toSelf().inSingletonScope();
botContainer.bind<YoutubeService>(YoutubeService).toSelf().inSingletonScope();
botContainer.bind<CommandService>(CommandService).toSelf().inSingletonScope();
botContainer.bind<Users>(Users).toSelf();

export { botContainer as BotContainer };
