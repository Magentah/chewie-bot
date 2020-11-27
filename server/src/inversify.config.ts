import { Container } from "inversify";
import "reflect-metadata";
import * as Controller from "./controllers";
import * as Repository from "./database";
import * as Service from "./services";

const botContainer = new Container();

botContainer.bind<Service.DatabaseService>(Service.DatabaseService).toSelf().inSingletonScope();
botContainer.bind<Service.DatabaseProvider>("DatabaseProvider").toProvider((context) => {
    return () => {
        return new Promise<Service.DatabaseService>(async (resolve, reject) => {
            try {
                const databaseService = context.container.get(Service.DatabaseService);
                await databaseService.initDatabase();
                return resolve(databaseService);
            } catch (e) {
                return reject(e);
            }
        });
    };
});

botContainer.bind<Service.WebsocketService>(Service.WebsocketService).toSelf().inSingletonScope();
botContainer.bind<Service.TwitchService>(Service.TwitchService).toSelf().inSingletonScope();
botContainer.bind<Service.CacheService>(Service.CacheService).toSelf().inSingletonScope();
botContainer.bind<Service.YoutubeService>(Service.YoutubeService).toSelf().inSingletonScope();
botContainer.bind<Service.SpotifyService>(Service.SpotifyService).toSelf().inSingletonScope();
botContainer.bind<Service.CommandService>(Service.CommandService).toSelf().inSingletonScope();
botContainer.bind<Service.SongService>(Service.SongService).toSelf().inSingletonScope();
botContainer.bind<Service.UserService>(Service.UserService).toSelf().inSingletonScope();
botContainer.bind<Repository.UsersRepository>(Repository.UsersRepository).toSelf();
botContainer.bind<Repository.UserLevelsRepository>(Repository.UserLevelsRepository).toSelf();
botContainer.bind<Repository.VIPLevelsRepository>(Repository.VIPLevelsRepository).toSelf();
botContainer.bind<Repository.DonationsRepository>(Repository.DonationsRepository).toSelf();
botContainer.bind<Repository.TextCommandsRepository>(Repository.TextCommandsRepository).toSelf();
botContainer.bind<Service.EventService>(Service.EventService).toSelf().inSingletonScope();

botContainer.bind<Controller.SongController>(Controller.SongController).toSelf();
botContainer.bind<Controller.TwitchController>(Controller.TwitchController).toSelf();
export { botContainer as BotContainer };
