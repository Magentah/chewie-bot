import { Container } from "inversify";

// Services
import DatabaseService from "./services/databaseService";
import DatabaseProvider from "./services/databaseService";
import WebsocketService from "./services/websocketService";
import TwitchService, { TwitchServiceProvider } from "./services/twitchService";
import CacheService from "./services/cacheService";
import YoutubeService from "./services/youtubeService";
import SpotifyService from "./services/spotifyService";
import CommandService from "./services/commandService";
import SongService from "./services/songService";
import UserService from "./services/userService";
import EventService from "./services/eventService";
import TwitchAuthService from "./services/twitchAuthService";
import TwitchEventService from "./services/twitchEventService";
import BotSettingsService from "./services/botSettingsService";
import RewardService from "./services/rewardService";
import StreamlabsService from "./services/streamlabsService";
import TwitchUserProfileService from "./services/twitchUserProfileService";
import UserPermissionService from "./services/userPermissionService";
import TwitchWebService from "./services/twitchWebService";
import DiscordService from "./services/discordService";
import DropboxService from "./services/dropboxService";
import EventLogService from "./services/eventLogService";
import ChannelPointRewardService from "./services/channelPointRewardService";
import TaxService from "./services/taxService";
import CardService from "./services/cardService";
import AchievementService from "./services/achievementService";
import EventAggregator from "./services/eventAggregator";
import TwitchPubSubService from "./services/twitchPubSubService";
import OpenAiService from "./services/openAiService";

// Database Repositories

import BotSettingsRepository from "./database/botSettings";
import UsersRepository from "./database/usersRepository";
import VIPLevelsRepository from "./database/vipLevels";
import DonationsRepository from "./database/donations";
import TextCommandsRepository from "./database/textCommands";
import QuotesRepository from "./database/quotesRepository";
import CommandAliasesRepository from "./database/commandAliases";
import TwitchUserProfileRepository from "./database/twitchUserProfileRepository";
import SonglistRepository from "./database/songlistRepository";
import DiscordRepository from "./database/discordRepository";
import EventLogsRepository from "./database/eventLogsRepository";
import MessagesRepository from "./database/messagesRepository";
import PointLogsRepository from "./database/pointLogsRepository";
import CardsRepository from "./database/cardsRepository";
import ChannelPointRewardRepository from "./database/channelPointRewardRepository";
import ChannelPointRewardHistoryRepository from "./database/channelPointRewardHistoryRepository";
import UserTaxHistoryRepository from "./database/userTaxHistoryRepository";
import UserTaxStreakRepository from "./database/userTaxStreakRepository";
import StreamActivityRepository from "./database/streamActivityRepository";
import AchievementsRepository from "./database/achievementsRepository";
import SeasonsRepository from "./database/seasonsRepository";
import RedemptionsRepository from "./database/redemptionsRepository";

// Controllers
import SongController from "./controllers/songController";
import TwitchController from "./controllers/twitchController";
import EventController from "./controllers/eventController";
import SonglistController from "./controllers/songlistController";
import DonationlistController from "./controllers/donationlistController";
import MessagelistController from "./controllers/messagelistController";
import UserlistController from "./controllers/userlistController";
import CommandlistController from "./controllers/commandlistController";
import SettingsController from "./controllers/settingsController";
import CardlistController from "./controllers/cardlistController";
import ChannelPointRewardController from "./controllers/channelPointRewardController";
import AchievementsController from "./controllers/achievementsController";
import SeasonController from "./controllers/seasonController";
import QuotelistController from "./controllers/quotelistController";
import RedemptionsController from "./controllers/redemptionsController";

// Commands
import * as Commands from "./commands/commandScripts";
import { Command } from "./commands/command";

const botContainer = new Container();

// Database Provider
botContainer.bind<DatabaseService>(DatabaseService).toSelf().inSingletonScope();
botContainer.bind<DatabaseProvider>("DatabaseProvider").toProvider((context) => {
    return () => {
        return new Promise<DatabaseService>(async (resolve, reject) => {
            try {
                const databaseService = context.container.get(DatabaseService);
                await databaseService.initDatabase();
                return resolve(databaseService);
            } catch (e) {
                return reject(e);
            }
        });
    };
});

// Twitch Provider
botContainer.bind<WebsocketService>(WebsocketService).toSelf().inSingletonScope();
botContainer.bind<TwitchService>(TwitchService).toSelf().inSingletonScope();
botContainer.bind<TwitchServiceProvider>("TwitchServiceProvider").toProvider((context) => {
    return () => {
        return new Promise<TwitchService>(async (resolve, reject) => {
            try {
                const twitchService = context.container.get(TwitchService);
                if (!twitchService.hasInitialized) {
                    await twitchService.initialize();
                }
                return resolve(twitchService);
            } catch (e) {
                return reject(e);
            }
        });
    };
});

// Services
botContainer.bind<TwitchAuthService>(TwitchAuthService).toSelf().inSingletonScope();
botContainer.bind<TwitchEventService>(TwitchEventService).toSelf().inSingletonScope();
botContainer.bind<CacheService>(CacheService).toSelf().inSingletonScope();
botContainer.bind<YoutubeService>(YoutubeService).toSelf().inSingletonScope();
botContainer.bind<SpotifyService>(SpotifyService).toSelf().inSingletonScope();
botContainer.bind<SongService>(SongService).toSelf().inSingletonScope();
botContainer.bind<UserService>(UserService).toSelf().inSingletonScope();
botContainer.bind<EventService>(EventService).toSelf().inSingletonScope();
botContainer.bind<BotSettingsService>(BotSettingsService).toSelf().inSingletonScope();
botContainer.bind<TwitchUserProfileService>(TwitchUserProfileService).toSelf().inSingletonScope();
botContainer.bind<DiscordService>(DiscordService).toSelf().inSingletonScope();
botContainer.bind<UserPermissionService>(UserPermissionService).toSelf().inSingletonScope();
botContainer.bind<TwitchWebService>(TwitchWebService).toSelf().inSingletonScope();
botContainer.bind<RewardService>(RewardService).toSelf().inSingletonScope();
botContainer.bind<StreamlabsService>(StreamlabsService).toSelf().inSingletonScope();
botContainer.bind<DropboxService>(DropboxService).toSelf().inSingletonScope();
botContainer.bind<EventLogService>(EventLogService).toSelf().inSingletonScope();
botContainer.bind<ChannelPointRewardService>(ChannelPointRewardService).toSelf().inSingletonScope();
botContainer.bind<TaxService>(TaxService).toSelf().inSingletonScope();
botContainer.bind<CardService>(CardService).toSelf().inSingletonScope();
botContainer.bind<AchievementService>(AchievementService).toSelf().inSingletonScope();
botContainer.bind<EventAggregator>(EventAggregator).toSelf().inSingletonScope();
botContainer.bind<TwitchPubSubService>(TwitchPubSubService).toSelf().inSingletonScope();
botContainer.bind<OpenAiService>(OpenAiService).toSelf().inSingletonScope();

// Database Repositories
botContainer.bind<UsersRepository>(UsersRepository).toSelf();
botContainer.bind<PointLogsRepository>(PointLogsRepository).toSelf();
botContainer.bind<VIPLevelsRepository>(VIPLevelsRepository).toSelf();
botContainer.bind<DonationsRepository>(DonationsRepository).toSelf();
botContainer.bind<TextCommandsRepository>(TextCommandsRepository).toSelf();
botContainer.bind<QuotesRepository>(QuotesRepository).toSelf();
botContainer.bind<CommandAliasesRepository>(CommandAliasesRepository).toSelf();
botContainer.bind<BotSettingsRepository>(BotSettingsRepository).toSelf();
botContainer.bind<SonglistRepository>(SonglistRepository).toSelf();
botContainer.bind<TwitchUserProfileRepository>(TwitchUserProfileRepository).toSelf();
botContainer.bind<DiscordRepository>(DiscordRepository).toSelf();
botContainer.bind<EventLogsRepository>(EventLogsRepository).toSelf();
botContainer.bind<MessagesRepository>(MessagesRepository).toSelf();
botContainer.bind<CardsRepository>(CardsRepository).toSelf();
botContainer.bind<ChannelPointRewardRepository>(ChannelPointRewardRepository).toSelf();
botContainer.bind<ChannelPointRewardHistoryRepository>(ChannelPointRewardHistoryRepository).toSelf();
botContainer.bind<UserTaxHistoryRepository>(UserTaxHistoryRepository).toSelf();
botContainer.bind<UserTaxStreakRepository>(UserTaxStreakRepository).toSelf();
botContainer.bind<StreamActivityRepository>(StreamActivityRepository).toSelf();
botContainer.bind<AchievementsRepository>(AchievementsRepository).toSelf();
botContainer.bind<SeasonsRepository>(SeasonsRepository).toSelf();
botContainer.bind<RedemptionsRepository>(RedemptionsRepository).toSelf();

// Controllers
botContainer.bind<SongController>(SongController).toSelf();
botContainer.bind<TwitchController>(TwitchController).toSelf();
botContainer.bind<EventController>(EventController).toSelf();
botContainer.bind<SonglistController>(SonglistController).toSelf();
botContainer.bind<DonationlistController>(DonationlistController).toSelf();
botContainer.bind<MessagelistController>(MessagelistController).toSelf();
botContainer.bind<UserlistController>(UserlistController).toSelf();
botContainer.bind<CommandlistController>(CommandlistController).toSelf();
botContainer.bind<RedemptionsController>(RedemptionsController).toSelf();
botContainer.bind<SettingsController>(SettingsController).toSelf();
botContainer.bind<CardlistController>(CardlistController).toSelf();
botContainer.bind<ChannelPointRewardController>(ChannelPointRewardController).toSelf();
botContainer.bind<AchievementsController>(AchievementsController).toSelf();
botContainer.bind<SeasonController>(SeasonController).toSelf();
botContainer.bind<QuotelistController>(QuotelistController).toSelf();

// Commands
const commandList: Map<string, Command> = new Map<string, Command>();
Object.keys(Commands).forEach((val, index) => {
    const commandName = val.substr(0, val.toLowerCase().indexOf("command"));
    const command = new (Object.values(Commands)[index])();
    commandList.set(commandName.toLowerCase(), command);
    for (const alias of command.getAliases()) {
        commandList.set(alias.alias.toLowerCase(), command);
    }
});
botContainer.bind<Map<string, Command>>("Commands").toConstantValue(commandList);

botContainer.bind<CommandService>(CommandService).toSelf().inSingletonScope();
export { botContainer as BotContainer };
