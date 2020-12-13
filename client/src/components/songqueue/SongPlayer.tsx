import React from "react";
import { Grid, Typography, Box, CircularProgress, Card } from "@material-ui/core";
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import PauseCircleOutlineIcon from '@material-ui/icons/PauseCircleOutline';
import IconButton from "@material-ui/core/IconButton";
import Slider from "@material-ui/core/Slider";

import {
    SpotifyDevice,
    SpotifyPlayerCallback,
    SpotifyPlayerStatus,
    WebPlaybackAlbum,
    WebPlaybackError,
    WebPlaybackImage,
    WebPlaybackPlayer,
    WebPlaybackReady,
    WebPlaybackState,
  } from './spotify';

import moment from "moment";
import axios from "axios";

interface IProps {
}

enum SpotifyPlayerState {
    NotLoaded,
    Initializing,
    Ready,
    Failed
}

interface IState {
    playbackPosMs: number,
    playbackDurationMs: number,
    isPlaying: boolean,
    playerState: SpotifyPlayerState
}

export class SongPlayer extends React.Component<IProps, IState> {
    private readonly SpotifyPlayerPlayUrl: string = "https://api.spotify.com/v1/me/player/play";
    private player?: WebPlaybackPlayer;

    constructor(props: any) {
        super(props);

        this.state = {
            playbackPosMs: 0,
            playbackDurationMs: 0,
            isPlaying: false,
            playerState: SpotifyPlayerState.NotLoaded
        };
    }

    public componentDidMount() {
        this.initPlayer();
    }

    public componentDidUpdate() {
        this.initPlayer();
    }

    public componentWillUnmount() {
        // TODO: remove listeners?
        this.player?.disconnect();
    }

    private initPlayer() {
        if (this.player == null) {
            this.appendSdkScript();
        }
    }

    /**
     * Convert milliseconds to time string (mm:ss).
     *
     * @param Number ms
     * @return String
     */
    private formatTime(ms: number): string {
        const mm = moment.duration(ms);
        return (mm.hours() * 60 + mm.minutes() + ':' + mm.seconds().toString().padStart(2, "0"));
    }

    /**
     * Appends the client-side API script to the document.
     * Whenever the script has been loaded it will
     * set the isLoaded state to true.
     */
    private async appendSdkScript() {
        // Only load Spotify if user has configured access token.
        try {
            const userHasToken = await axios.get("/api/auth/spotify/hasconfig", {
                withCredentials: true,
            });

            if (!userHasToken.data) {
                return;
            }
        } catch {
            return;
        }

        this.setState({
            playbackPosMs: 0,
            playbackDurationMs: 0,
            isPlaying: false,
            playerState: SpotifyPlayerState.Initializing
        });

        // Make sure that script is only included once
        const existingScriptElement = document.querySelector('script#spotify-sdk');
        if (existingScriptElement) {
            existingScriptElement.parentNode?.removeChild(existingScriptElement);
        }

        const script = document.createElement('script')
        script.id = 'spotify-sdk'
        script.src = 'https://sdk.scdn.co/spotify-player.js'
        script.async = true
        script.defer = true
        script.crossOrigin = 'anonymous'
        document.body.append(script);

        // @ts-ignore
        window.onSpotifyWebPlaybackSDKReady = () => {
            const playerName = 'Chewie-Bot Web Player';

            // Reference for the Web Playback SDK: https://developer.spotify.com/documentation/web-playback-sdk/reference/
            // @ts-ignore
            this.player = new window.Spotify.Player({
              name: playerName,
              getOAuthToken: (cb: SpotifyPlayerCallback) => {
                  // According to a code snippet on https://developer.spotify.com/documentation/web-playback-sdk/reference/#api-spotify-player
                  // it should be fine to request a fresh token whenever this function is run.
                  axios.get("/api/auth/spotify/access", {
                        withCredentials: true,
                    }).then((res) => {
                        if (res.data) {
                            cb(res.data);
                        }
                    })
                    .catch((error) => {
                        cb("");
                    });                  
                }
            }) as WebPlaybackPlayer;

            this.player.addListener('ready', ({ device_id }: WebPlaybackReady) => {
                console.log('Ready with Device ID', device_id);
                this.setState({
                    playbackPosMs: 0,
                    playbackDurationMs: 0,
                    isPlaying: false,
                    playerState: SpotifyPlayerState.Ready
                });
            });

            this.player.addListener('authentication_error', ({ message }) => {
                console.error('Failed to authenticate', message);
                this.setState({
                    playbackPosMs: 0,
                    playbackDurationMs: 0,
                    isPlaying: false,
                    playerState: SpotifyPlayerState.Failed
                });
            });
            
            // This event is fired when playback starts or pauses. It is not happening 
            // frequent enough to update the current position in the song.
            this.player.addListener('player_state_changed', (playerState: WebPlaybackState|null) => {
                if (playerState) {                   
                    this.setState( {
                        playbackPosMs: playerState.position,
                        playbackDurationMs: playerState.duration,
                        isPlaying: !playerState.paused,
                        playerState: this.state.playerState
                     });

                } else {
                    this.setState( {
                        playbackPosMs: 0,
                        playbackDurationMs: 0,
                        isPlaying: false,
                        playerState: this.state.playerState
                     });
                }
              });

            this.player.connect().then(null, (reason) => {
                this.setState( {
                    playbackPosMs: 0,
                    playbackDurationMs: 0,
                    isPlaying: false,
                    playerState: SpotifyPlayerState.Failed
                 });
            });

            // TODO: Use this.player.getCurrentState() to update the slider more often.
        }
    };

    private togglePlayback() {
        if (!this.player) {
            return;
        }

        if (this.state.isPlaying) {
            this.player.pause().then(() => {
                console.log('Paused!');
            });
        } else {
            this.player.resume().then(() => {
                console.log('Resumed!');
            });
        }
    }

    private seek(newPercentage: number | number[]) {
        if (!this.player) {
            return;
        }

        if (newPercentage) {
            this.player.getCurrentState().then((playbackState: WebPlaybackState | null) => {
                if (playbackState) {
                    const newPlaybackPos = playbackState.duration * (newPercentage as number) / 100.0;
                    this.player?.seek(newPlaybackPos).then(() => {
                        console.log('Seek!');
                    });
                }
            });
        }
    }

    public playSong(id: string) {
        if (this.player == null) {
            return;
        }

        const callback: SpotifyPlayerCallback = (token: string) => {
            const postData = JSON.stringify({ uris: ["spotify:track:" + id] });
            const authOptions = {
                headers: { "Authorization": `Bearer ${token}`, "content-type": "application/json" }
            };
            const response = axios.put(`${this.SpotifyPlayerPlayUrl}?device_id=${this.player?._options.id}`, postData, authOptions);
            return "";
        };

        // @ts-ignore
        this.player._options.getOAuthToken(callback);
    }

    public render() {
        let content;

        switch (this.state.playerState) {
            case SpotifyPlayerState.NotLoaded:
                return null;

            case SpotifyPlayerState.Failed:
                return null;

            case SpotifyPlayerState.Initializing:
                // Show progress while initialising the Spotify player
                content = (
                    <Grid container spacing={2} alignItems="center">
                        <Grid item><CircularProgress size="1.5rem" /></Grid>
                        <Grid item><Typography>Connecting to Spotify...</Typography></Grid>
                    </Grid>);
                break;

            case SpotifyPlayerState.Ready:
                // Start showing player only when we have a valid Spotify configuration (that is, we got an access token from the server).
                let icon =  <PlayCircleOutlineIcon />;
                if (this.state.isPlaying) {
                    icon = <PauseCircleOutlineIcon />;
                }
                
                content = (            
                    <Grid container spacing={2} alignItems="center">
                        <Grid item><Typography>{this.formatTime(this.state.playbackPosMs)}</Typography></Grid>
                        <Grid item xs><Slider value={this.state.playbackPosMs / this.state.playbackDurationMs * 100}
                                              onChange={(event: object, newPercentage: number | number[]) => this.seek(newPercentage)} /></Grid>
                        <Grid item><Typography>{this.formatTime(this.state.playbackDurationMs)}</Typography></Grid>
                        <Grid item>
                            <IconButton  onClick={() => this.togglePlayback()}>
                                {icon}
                            </IconButton>
                        </Grid>
                    </Grid>
                );
                break;
        }

        return (
            <Box mt={2}>
                <Card>
                    <Box p={1}>
                        {content}
                    </Box>
                </Card>
            </Box>);
    }
};

export default SongPlayer;
