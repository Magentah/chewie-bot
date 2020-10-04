import "reflect-metadata";
import { Container } from "inversify";
import * as Service from "./services";
import * as Repository from "./database";
import * as Controller from "./controllers";
import { Logger, LogType } from "./logger";

const botContainer = new Container();

botContainer
    .bind<Service.DatabaseService>(Service.DatabaseService)
    .toSelf()
    .inSingletonScope()
    .onActivation((context, databaseService) => {
        databaseService.initDatabase();
        return databaseService;
    });
botContainer.bind<Service.TwitchService>(Service.TwitchService).to(Service.TwitchService).inSingletonScope();
botContainer.bind<Service.CacheService>(Service.CacheService).to(Service.CacheService).inSingletonScope();
botContainer.bind<Service.YoutubeService>(Service.YoutubeService).to(Service.YoutubeService).inSingletonScope();
botContainer.bind<Service.CommandService>(Service.CommandService).to(Service.CommandService).inSingletonScope();
botContainer.bind<Service.SongService>(Service.SongService).to(Service.SongService).inSingletonScope();
botContainer.bind<Service.UserService>(Service.UserService).to(Service.UserService).inSingletonScope();
botContainer.bind<Repository.UsersRepository>(Repository.UsersRepository).to(Repository.UsersRepository);
botContainer.bind<Repository.UserLevelsRepository>(Repository.UserLevelsRepository).to(Repository.UserLevelsRepository);
botContainer.bind<Repository.VIPLevelsRepository>(Repository.VIPLevelsRepository).to(Repository.VIPLevelsRepository);
botContainer.bind<Repository.DonationsRepository>(Repository.DonationsRepository).to(Repository.DonationsRepository);
botContainer
    .bind<Repository.TextCommandsRepository>(Repository.TextCommandsRepository)
    .to(Repository.TextCommandsRepository);

botContainer.bind<Controller.SongController>(Controller.SongController).to(Controller.SongController);
export { botContainer as BotContainer };
