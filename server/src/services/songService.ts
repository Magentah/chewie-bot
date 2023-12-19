import { inject, injectable } from "inversify";
import moment = require("moment");
import { InvalidSongUrlError, SongAlreadyInQueueError } from "../errors";
import { Logger, LogType } from "../logger";
import { AchievementType, EventLogType, ISong, IUser, RequestSource, SocketMessageType, SongSource } from "../models";
import SpotifyService from "./spotifyService";
import WebsocketService from "./websocketService";
import { YoutubeService } from "./youtubeService";
import { EventLogService } from "./eventLogService";
import { TwitchWebService } from "./twitchWebService";
import OpenAiService from "./openAiService";
import EventAggregator from "./eventAggregator";
import SeasonsRepository from "../database/seasonsRepository";
import UserService from "./userService";
import { getLinkPreview } from "link-preview-js";

@injectable()
export class SongService {
    private songQueue: ISong[] = [];
    private nextSongId = 1;

    constructor(
        @inject(YoutubeService) private youtubeService: YoutubeService,
        @inject(SpotifyService) private spotifyService: SpotifyService,
        @inject(WebsocketService) private websocketService: WebsocketService,
        @inject(EventLogService) private eventLogService: EventLogService,
        @inject(EventAggregator) private eventAggregator: EventAggregator,
        @inject(UserService) private userService: UserService,
        @inject(SeasonsRepository) private seasonsRepository: SeasonsRepository,
        @inject(TwitchWebService) private twitchWebService: TwitchWebService,
        @inject(OpenAiService) private openAiService: OpenAiService,
    ) {
        //
    }

    /**
     * Helper function to test whether an object implements the ISong interface.
     * @param obj The object to test.
     */
    private isSong(obj: any): obj is ISong {
        return "id" in obj && "title" in obj && "requestedBy" in obj && "source" in obj;
    }

    /**
     * Parses a URL to get the video source and ID. This is used in API calls to get details about the video.
     * @param {string} url Video URL to parse
     */
    private parseUrl(url: string): ISong {
        // https://www.youtube.com/watch?v=l0qWjHP1GQc&list=RDl0qWjHP1GQc&start_radio=1

        const song: ISong = {} as ISong;
        const fullurl = /^https?:\/\//i.test(url) ? url: "https://" + url;

        const id = this.youtubeService.parseYoutubeUrl(fullurl);
        if (id) {
            song.source = SongSource.Youtube;
            song.sourceId = id;
        } else {
            const sid = this.spotifyService.parseSpotifyUrl(fullurl);
            if (sid) {
                song.source = SongSource.Spotify;
                song.sourceId = sid;
            } else {
                // Not a youtube url. Parse other urls in future
                throw new InvalidSongUrlError("URL is not a valid YouTube URL");
            }
        }

        song.sourceUrl = fullurl;
        return song;
    }

    /**
     * Parses any URL and tries to get some info suitable for the song queue.
     * @param {string} url Video URL to parse
     */
    private async parseAnyUrl(url: string): Promise<ISong> {
        const song: ISong = {} as ISong;
        const fullurl = /^https?:\/\//i.test(url) ? url: "https://" + url;

        // Gets song details by using Open Graph meta information of the page
        // (works on Soundcloud and Bandcamp for example).
        const data = await getLinkPreview(url);

        song.source = SongSource.Unknown;
        song.sourceUrl = fullurl;

        if ("title" in data && data.images.length > 0) {
            song.title = data.title;
            song.sourceUrl = song.sourceUrl;
            song.previewUrl = data.images[0];
        } else {
            throw new InvalidSongUrlError("URL does not contain any usable information");
        }

        return song;
    }

    /**
     * Get details for a song from the songs source API (Youtube, Spotify, etc).
     * @param song The song to get details for.
     */
    private async getSongDetails(song: ISong): Promise<ISong> {
        switch (song.source) {
            case SongSource.Youtube: {
                const songDetails = await this.youtubeService.getSongDetails(song.sourceId);
                if (songDetails) {
                    song.title = songDetails.snippet.title;
                    song.duration = this.youtubeService.getSongDuration(songDetails);
                    song.sourceUrl = song.sourceUrl;
                    song.previewUrl = this.youtubeService.getSongPreviewUrl(songDetails);
                } else {
                    throw new InvalidSongUrlError("Song details could not be loaded");
                }
                break;
            }
            case SongSource.Spotify: {
                const songDetails = await this.spotifyService.getSongDetails(song.sourceId);
                if (songDetails) {
                    song.title = songDetails.name;
                    song.duration = this.spotifyService.getSongDuration(songDetails);
                    song.sourceUrl = song.sourceUrl;
                    song.previewUrl = this.spotifyService.getSongPreviewUrl(songDetails);
                } else {
                    throw new InvalidSongUrlError("Song details could not be loaded");
                }
                break;
            }
        }
        return song;
    }

    /**
     * Add a song to the song queue.
     * @param url The url of the song to add to the queue.
     * @param requestSource The source of the request (Donation, Bits, Subscription, Raffle).
     * @param username The username that is requesting the song to be added.
     * @param comments Additional comments/instructions for the song
     */
    public async addSong(url: string, requestSource: RequestSource, username: string, comments: string, title = "", requestSourceDetails = ""): Promise<ISong> {
        const song: ISong = await this.getSong(url);

        try {
            song.id = this.nextSongId++;
            if (title) {
                song.title = title;
            }

            this.songQueue.push(song);
            Logger.info(LogType.Song, `${song.source}:${song.sourceId} added to Song Queue`);
            song.requestedBy = username;
            song.requestSource = requestSource;
            song.requestSourceDetails = requestSourceDetails;
            song.requestTime = moment.now();
            song.comments = comments;

            void this.websocketService.send({
                type: SocketMessageType.SongAdded,
                message: "Song Added",
                data: song
            });

            const user = await this.userService.getUser(username);
            await this.eventLogService.addSongRequest(user ?? username, song);

            if (user) {
                const currentSeasonStart = (await this.seasonsRepository.getCurrentSeason()).startDate;
                const count = await this.eventLogService.getCount(EventLogType.SongRequest, user);
                const seasonalCount = await this.eventLogService.getCount(EventLogType.SongRequest, user, currentSeasonStart);
                this.eventAggregator.publishAchievement({ user, type: AchievementType.SongRequests, count, seasonalCount });
            }

            if (song.source !== SongSource.Spotify) {
                void this.addPlainSongTitle(song);
            }

            return song;
        } catch (err) {
            if (err instanceof InvalidSongUrlError) {
                Logger.info(LogType.Song, `${url} is an invalid song url.`);
                throw err;
            } else {
                throw err;
            }
        }
    }

    /**
     * Titles for music videos are quite messy to try to provide a cleaned up and translated song title here.
     * @param song Song to update
     */
    private async addPlainSongTitle(song: ISong): Promise<void> {
        const prompt = "Cleanup the following music video title. Remove irrelevant information like \"official video\", \"official MV\" etc. " +
            "Think of what else can be removed and reduce title to the song name and artist (don't include artist if information is missing). " +
            "Keep title of the TV show if included. If the song name is non-English, add a translation for the song name. \r\n" + song.title;
        const result = await this.openAiService.generateText(prompt, false);
        if (result) {
            song.cleanTitle = result;

            this.websocketService.send({
                type: SocketMessageType.SongUpdated,
                message: "Song Updated",
                data: song
            });
        }

        const promptDetails = "From the following youtube video title extract title, artist and TV show / anime / movie (labelled as \"Source\") if present. Provide a JSON object with each title, artist and source " +
            "in a separate key. For title, artist and source, add a *_translated key if the text is non-English, providing a mostly literal translation.\r\n" + song.title;
        const resultDetail = await this.openAiService.generateText(promptDetails, false);
        if (resultDetail) {
            try {
                const resultData = JSON.parse(resultDetail) as { title: string,
                    title_translated?: string
                    artist: string,
                    artist_translated?: string,
                    source: string,
                    source_translated?: string
                };

                song.detailedTitle = "Title: " + resultData.title;
                if (resultData.title_translated && resultData.title_translated !== resultData.title) {
                    song.detailedTitle += ` (${resultData.title_translated})`;
                }

                if (resultData.artist) {
                    song.detailedTitle += `\r\nArtist: ${resultData.artist}`;
                    if (resultData.artist_translated && resultData.artist_translated !== resultData.artist) {
                        song.detailedTitle += ` (${resultData.artist_translated})`;
                    }
                }

                if (resultData.source && resultData.source !== resultData.artist) {
                    song.detailedTitle += `\r\nSource: ${resultData.source}`;
                    if (resultData.source_translated && resultData.source_translated !== resultData.source) {
                        song.detailedTitle += ` (${resultData.source_translated})`;
                    }
                }
            } catch (err: any) {
                song.detailedTitle = undefined;
            }

            this.websocketService.send({
                type: SocketMessageType.SongUpdated,
                message: "Song Updated",
                data: song
            });
        }
    }

    /**
     * Loads the song information from a URL
     * @param url URL to load
     * @returns
     */
    private async getSong(url: string) {
        let song: ISong;

        try {
            song = this.parseUrl(url);

            const existingSong = Object.values(this.songQueue).filter((s) => {
                return s.sourceId === song.sourceId && s.source === song.source;
            })[0];

            if (existingSong) {
                throw new SongAlreadyInQueueError("Song has already been added to the queue.");
            }

            return await this.getSongDetails(song);
        } catch (err: any) {
            // We can check for same URL before getting any details here.
            const existingSong = Object.values(this.songQueue).filter((s) => {
                return s.sourceUrl === url;
            })[0];

            if (existingSong) {
                throw new SongAlreadyInQueueError("Song has already been added to the queue.");
            }

            return await this.parseAnyUrl(url);
        }
    }

    /**
     * Adds a song to the queue using a gold song request.
     * @param url URL to the song
     * @param user User who requested
     * @returns Error message or result song
     */
    public async addGoldSong(url: string, user: IUser, comments: string): Promise<string|ISong> {
        // Check if user has gold status
        if (!user.vipExpiry && !user.vipPermanentRequests) {
            return `${user.username}, you need VIP gold status to request a song. Check !vipgold for details.`;
        }

        const todayDate = new Date(new Date().toDateString());

        // Check if gold status has expired (expiration date is inclusive).
        if (!user.vipPermanentRequests && user.vipExpiry) {
            if (user.vipExpiry < todayDate) {
                return `${user.username}, your VIP gold status expired on ${user.vipExpiry.toDateString()}.`;
            }
        }

        // Check if gold song has been used this week.
        if (user.vipLastRequest && user.vipExpiry) {
            const startOfWeek = this.getIndividualStartOfWeek(todayDate, user.vipExpiry);
            if (user.vipLastRequest >= startOfWeek) {
                return `Sorry ${user.username}, you already had a gold song request this week.`;
            }
        }

        const song = await this.addSong(url, RequestSource.GoldSong, user.username, comments);
        user.vipLastRequest = todayDate;

        // Any gold song used will always reduce the amount of permanent requests left.
        // Adding a permanent request will also extend the VIP period, so no request will be lost.
        if (user.vipPermanentRequests) {
            user.vipPermanentRequests--;
        }

        await this.userService.updateUser(user);
        return song;
    }

    /**
     * Set a song in the queue to Played status.
     * @param song The song or song id to update.
     */
    public async songPlayed(song: ISong | number): Promise<void> {
        if (typeof song === "number") {
            const songToChange = this.songQueue.filter((item) => { return item.id === song; })[0] || undefined;
            if (songToChange) {
                const songIndex = this.songQueue.indexOf(songToChange);
                const songData = this.songQueue[songIndex];
                this.songQueue.splice(songIndex, 1);

                const user = await this.userService.getUser(songData.requestedBy);
                void this.eventLogService.addSongPlayed(user ?? songData.requestedBy, songData);
                if (songData.rewardEvent) {
                    await this.twitchWebService.tryUpdateChannelRewardStatus(songData.rewardEvent.reward.id, songData.rewardEvent.id, "FULFILLED");
                }

                void this.websocketService.send({
                    type: SocketMessageType.SongPlayed,
                    message: "Song Played",
                    data: songData,
                });
            }
        } else {
            const songData = this.songQueue.filter((item) => { return item.id === song.id; })[0] || undefined;
            if (songData) {
                const songIndex = this.songQueue.indexOf(songData);
                this.songQueue.splice(songIndex, 1);

                void this.eventLogService.addSongPlayed(song.requestedBy, songData);
                if (songData.rewardEvent) {
                    await this.twitchWebService.tryUpdateChannelRewardStatus(songData.rewardEvent.reward.id, songData.rewardEvent.id, "FULFILLED");
                }

                void this.websocketService.send({
                    type: SocketMessageType.SongPlayed,
                    message: "Song Played",
                    data: song,
                });
            }
        }
    }

    /**
     * Moves a song to the top of the song queue.
     * @param song The song or song id to remove.
     */
    public moveSongToTop(song: ISong | number): void {
        if (typeof song === "number") {
            const songToMove =
                this.songQueue.filter((item) => {
                    return item.id === song;
                })[0] || undefined;
            if (songToMove) {
                const songIndex = this.songQueue.indexOf(songToMove);
                this.songQueue.splice(songIndex, 1);
                this.songQueue.splice(0, 0, songToMove);

                void this.websocketService.send({
                    type: SocketMessageType.SongMovedToTop,
                    message: "Song moved to top",
                    data: songToMove,
                });
            }
        } else if (this.isSong(song)) {
            const songData =
                this.songQueue.filter((item) => {
                    return item.id === song.id;
                })[0] || undefined;
            if (songData) {
                const index = this.songQueue.indexOf(songData);
                this.songQueue.splice(index, 1);
                this.songQueue.splice(0, 0, song);

                void this.websocketService.send({
                    type: SocketMessageType.SongMovedToTop,
                    message: "Song moved to top",
                    data: song,
                });
            }
        }
    }

    /**
     * Remove a song from the song queue.
     * @param song The song or song id to remove.
     */
    public async removeSong(song: ISong | number): Promise<void> {
        if (typeof song === "number") {
            const songToDelete = this.songQueue.filter((item) => { return item.id === song; })[0] || undefined;
            if (songToDelete) {
                const songIndex = this.songQueue.indexOf(songToDelete);
                const songData = this.songQueue[songIndex];
                this.songQueue.splice(songIndex, 1);

                const user = await this.userService.getUser(songData.requestedBy);
                await this.eventLogService.addSongRemoved(user ?? songData.requestedBy, {
                    message: "Song has been removed from request queue.",
                    song: {
                        title: songData.title,
                        requestedBy: songData.requestedBy,
                    },
                });

                if (songData.rewardEvent) {
                    await this.twitchWebService.tryUpdateChannelRewardStatus(songData.rewardEvent.reward.id, songData.rewardEvent.id, "CANCELED");
                }

                void this.websocketService.send({
                    type: SocketMessageType.SongRemoved,
                    message: "Song Removed",
                    data: songData,
                });
            }
        } else if (this.isSong(song)) {
            const songData = this.songQueue.filter((item) => { return item.id === song.id; })[0] || undefined;
            if (songData) {
                const index = this.songQueue.indexOf(songData);
                this.songQueue.splice(index, 1);

                await this.eventLogService.addSongRemoved(song.requestedBy, {
                    message: "Song has been removed from request queue.",
                    song: {
                        title: song.title,
                        requestedBy: song.requestedBy,
                    },
                });

                if (songData.rewardEvent) {
                    await this.twitchWebService.tryUpdateChannelRewardStatus(songData.rewardEvent.reward.id, songData.rewardEvent.id, "CANCELED");
                }

                void this.websocketService.send({
                    type: SocketMessageType.SongRemoved,
                    message: "Song Removed",
                    data: song,
                });
            }
        }
    }

    /**
     * Updates the details of a song in the queue.
     * @param newSong New song information.
     */
    public async updateSong(newSong: ISong) {
        for (const song of this.songQueue) {
            if (song.id === newSong.id) {
                const changeTitle = song.title !== newSong.title;
                const changeCleanTitle = song.cleanTitle !== newSong.cleanTitle;

                // Change URL, update information (if possible).
                if (song.sourceUrl !== newSong.sourceUrl) {
                    const newSongData = await this.getSong(newSong.sourceUrl);
                    song.title = newSongData.title;
                    song.duration = newSongData.duration;
                    song.source = newSongData.source;
                    song.sourceId = newSongData.sourceId;
                    song.sourceUrl = newSongData.sourceUrl;
                    song.previewUrl = newSongData.previewUrl;
                    song.detailedTitle = undefined;

                    if (!changeCleanTitle) {
                        // Auto generate new clean title if no manual change
                        song.cleanTitle = undefined;
                        void this.addPlainSongTitle(song);
                    }
                }

                // Override title determined by URL if changed manually.
                if (changeTitle) {
                    song.title = newSong.title;
                    song.detailedTitle = undefined;
                }

                if (changeCleanTitle) {
                    song.cleanTitle = newSong.cleanTitle;
                    song.detailedTitle = undefined;
                }

                song.comments = newSong.comments;
                song.requestedBy = newSong.requestedBy;

                void this.websocketService.send({
                    type: SocketMessageType.SongUpdated,
                    message: "Song Updated",
                    data: song,
                });
            }
        }
    }

    /**
     * Get the list of songs in the song queue.
     */
    public getSongQueue(): ISong[] {
        return this.songQueue;
    }

    /**
     * Get the list of songs in the song queue requested by a specific user.
     * @param username The user to get the list of songs for.
     */
    public getSongsByUsername(username: string): ISong[] {
        const userSongs = Object.values(this.songQueue).filter((song) => {
            return song.requestedBy === username;
        });
        return userSongs;
    }

    /**
     * Extracts URLs from a string.
     */
    public static getSongsForQueue(message: string): string[] {
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const result = urlRegex.exec(message);
        if (!result) {
            return /(www.+)/gi.exec(message) ?? [];
        } else {
            return result;
        }
    }

    private getDayStartingAtMonday(date: Date): number {
        const day = date.getDay();
        return day === 0 ? 6 : day -1;
    }

    /**
     * Determines the start of the week based on the individual VIP expiry date.
     * If VIP expires on Friday (inclusive), the next VIP week starts on Saturday.
     * @param dateToCheck Day when the request is being made (should be today)
     * @param vipExpiry Day when VIP expires
     * @returns Start of the current VIP week. Within result and dateToCheck, only one VIP request is allowed.
     */
    private getIndividualStartOfWeek(dateToCheck: Date, vipExpiry: Date) {
        // Make copy
        vipExpiry = new Date(vipExpiry);

        // Determine week start day based on VIP expiry (VIP weekday + 1)
        vipExpiry.setDate(vipExpiry.getDate() + 1);
        const vipWeekday = this.getDayStartingAtMonday(vipExpiry);

        const todayWeekday = this.getDayStartingAtMonday(dateToCheck);
        const dayDifference = todayWeekday - vipWeekday;
        const weekStartDay = new Date(new Date(dateToCheck).setDate(dateToCheck.getDate() - dayDifference));

        if (weekStartDay > dateToCheck)  {
            // Date for this weekday is in the future, use last week instead.
            weekStartDay.setDate(weekStartDay.getDate() - 7);
            return weekStartDay;
        } else {
            return weekStartDay;
        }
    }
}

export default SongService;
