import 'reflect-metadata';
import { Container } from 'inversify';
import OAuthService from './services/oauthService';
import DatabaseService from './services/databaseService';
import TwitchService from './services/twitchService';
import CacheService from './services/cacheService';
import YoutubeService from './services/youtubeService';
import CommandService from './services/commandService';
import Users from './database/users';
import TextCommands from './database/textCommands';
import Donations from './database/donations';
import UserLevels from './database/userLevels';
import ModLevels from './database/modLevels';
import SongService from './services/songService';

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
botContainer.bind<SongService>(SongService).toSelf().inSingletonScope();

botContainer.bind<Users>(Users).toSelf();
botContainer.bind<UserLevels>(UserLevels).toSelf();
botContainer.bind<ModLevels>(ModLevels).toSelf();
botContainer.bind<Donations>(Donations).toSelf();
botContainer.bind<TextCommands>(TextCommands).toSelf();
export { botContainer as BotContainer };
