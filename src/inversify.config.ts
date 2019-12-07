import 'reflect-metadata';
import { Container } from 'inversify';
import OAuthService from './services/oauthService';
import DatabaseService, {DatabaseProvider} from './services/databaseService';
import TwitchService from './services/twitchService';
import CacheService from './services/cacheService';
import YoutubeService from './services/youtubeService';
import CommandService from './services/commandService';
import UsersRepository from './database/usersRepository';
import TextCommandsRepository from './database/textCommands';
import DonationsRepository from './database/donations';
import UserLevelsRepository from './database/userLevelsRepository';
import VIPLevelsRepository from './database/vipLevels';
import SongService from './services/songService';
import UserService from './services/userService';

const botContainer = new Container();

botContainer.bind<OAuthService>(OAuthService).toSelf().inSingletonScope();
botContainer.bind<DatabaseService>(DatabaseService).toSelf().inSingletonScope();
// .onActivation((context, service) => {
//     service.initDatabase(); // caveat - initDB is asynchronously called, may not be initialized on use.
//     return service;
// });

botContainer.bind<DatabaseProvider>("DatabaseProvider").toProvider(context => {
    return () => {
        return new Promise<DatabaseService>(async (resolve, reject) => {
            console.log("-------dbprovder---- get db service");
            try{
                const dbService: DatabaseService = context.container.get<DatabaseService>(DatabaseService);
     
                await dbService.initDatabase();
                console.log("dbService.nitialize", dbService.isInitialized);
                return resolve(dbService);
            } catch(e){
                console.log("what")
                return reject(e);
            }  
        })
    }
});
// botContainer.bind<DatabaseService>(DatabaseService).
botContainer.bind<TwitchService>(TwitchService).toSelf().inSingletonScope();
botContainer.bind<CacheService>(CacheService).toSelf().inSingletonScope();
botContainer.bind<YoutubeService>(YoutubeService).toSelf().inSingletonScope();
botContainer.bind<CommandService>(CommandService).toSelf().inSingletonScope();
botContainer.bind<SongService>(SongService).toSelf().inSingletonScope();
botContainer.bind<UserService>(UserService).toSelf().inSingletonScope();

botContainer.bind<UsersRepository>(UsersRepository).toSelf();
botContainer.bind<UserLevelsRepository>(UserLevelsRepository).toSelf();
botContainer.bind<VIPLevelsRepository>(VIPLevelsRepository).toSelf();
botContainer.bind<DonationsRepository>(DonationsRepository).toSelf();
botContainer.bind<TextCommandsRepository>(TextCommandsRepository).toSelf();
export { botContainer as BotContainer };
