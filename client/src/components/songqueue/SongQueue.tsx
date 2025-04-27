import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { Image } from "react-bootstrap";
import
{
    Grid, Typography, Box, ImageList, ImageListItem, ImageListItemBar, Divider,
    TextField, Button, Snackbar, CircularProgress, Paper, Link, Tabs, Tab, Dialog, DialogTitle, DialogActions, DialogContent, Theme, SnackbarCloseReason,
} from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { Alert } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import WebsocketService, { SocketMessageType, ISocketMessage } from "../../services/websocketService";
import moment from "moment";
import axios from "axios";
import MaterialTable, { Action, Column, Options } from "@material-table/core";
import useSetting from "../../hooks/setting";
import { UserContext } from "../../contexts/userContext";
import SongHistory from "./SongHistory";
import Song, { SongSource } from "./song";
import RequestDateCell from "./RequestDateCell";
import { Delete, OpenInNew, PlayCircleOutline, AttachMoney, VerticalAlignTop, Check } from "@mui/icons-material";
import { UserLevels } from "components/common/userLevel";

const useStyles = makeStyles()((theme: Theme) => ({
    root: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "flex-start",
      overflow: "hidden",
      backgroundColor: theme.palette.background.paper,
      marginBottom: "2em",
      marginTop: "1em"
    },
    gridList: {
        width: "100%"
    },
    icon: {
      color: "rgba(255, 255, 255, 0.54)",
    },
    addButton: {
        margin: theme.spacing(2, 0, 2),
    },
    requestHistory: {
        margin: theme.spacing(0),
    },
    table: {
        "& tbody tr:last-child td": {
          border: 0
        }
      }
}));

const DetailCell: React.FC<{value: Song, onPlaySong: (id: string) => void}> = (props) => {
    let duration = "";
    if (props.value.duration) {
        const ms = moment.duration(props.value.duration).asMilliseconds();
        if (ms) {
            duration = moment.utc(ms).format("HH:mm:ss");
        }
    }

    const playButton = props.value.source === SongSource.Spotify ? (<Grid item>
        <IconButton onClick={() => props.onPlaySong(props.value.sourceId)}>
            <PlayCircleOutline />
        </IconButton>
    </Grid>) : undefined;

    return (
        <Grid container direction="row" justifyContent="flex-start" wrap="nowrap">
            <Grid item>
                <a href={props.value.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <Image style={{ maxHeight: "100px" }} src={props.value.previewUrl} thumbnail />
                </a>
            </Grid>
            <Grid item xs>
                <Grid container style={{ marginLeft: "1em" }}>
                    <Grid>
                        <Grid item xs={12}>
                            <Typography>
                                <Link href={props.value.sourceUrl} target="_blank" rel="noopener noreferrer">
                                    {props.value?.title}
                                </Link>
                            </Typography>
                        </Grid>
                        {duration && <Grid>
                            <Typography style={{ fontSize: 14, fontStyle: "italic" }}>
                                Length: {duration}{" "}
                            </Typography>
                        </Grid>}
                    </Grid>
                    {playButton}
                </Grid>
            </Grid>
        </Grid>
    );
};

const RequestUserTimeCell: React.FC<any> = (value: Song) => {
    return (
        <React.Fragment>
            <div>
                {value?.requestedBy}
            </div>
            <div>
            🕑 {moment(value?.requestTime).format("HH:mm")}
            </div>
        </React.Fragment>
    );
};

const RequestSourceCell: React.FC<any> = (value: Song) => {
    return (
        <Grid>
            <Grid item>{value.requestSource}</Grid>
            <Grid item>{value.requestSourceDetails}</Grid>
        </Grid>
    );
};

interface OwnRequest {
    index: number,
    song: Song
}

type NoSongRequestState = {
    state: undefined;
};

type AddedSongRequestState = {
    state: "success";
};

type AddingSongRequestState = {
    state: "progress";
};

type FailedSongRequestState = {
    state: "failed";
    message: string;
};

type SongRequestState = NoSongRequestState | AddedSongRequestState | AddingSongRequestState | FailedSongRequestState;

const SongQueue: React.FC<{onPlaySong: (id: string) => void}> = (props) => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [playedSongs, setPlayedSongs] = useState<Song[]>([]);
    const websocket = useRef<WebsocketService | undefined>(undefined);
    const userContext = useContext(UserContext);
    const donationLinkUrl = useSetting<string>("song-donation-link");
    const [songRequestState, setSongRequestState] = useState<SongRequestState>();
    const [selectedTab, setSelectedTab] = React.useState(0);
    const [editingSong, setEditingSong] = useState<Song>();
    const [editingSongTitle, setEditingSongTitle] = useState<string>("");
    const [editingSongCleanTitle, setEditingSongCleanTitle] = useState<string>("");
    const [editingSongComment, setEditingSongComment] = useState<string>("");
    const [editingSongRequester, setEditingSongRequester] = useState<string>("");
    const [editingSongUrl, setEditingSongUrl] = useState<string>("");
    const [songToDelete, setSongToDelete] = useState<Song | Song[] | undefined>();

    const { classes } = useStyles();

    const addSong = (newSong: Song) => setSongs((state: Song[]) => {
        for (const song of state) {
            if (song.id === newSong.id) {
                return state;
            }
        }
        return [...state, newSong];
    });

    // For comparisons, compare by internal ID since object equality is not ensured
    // (song comments will be removed for regular users).
    const deleteSong = (song: Song) =>
        setSongs((state: Song[]) => {
            return state.filter((s, i) => s.id !== song.id);
        });

    const moveSongToTop = (song: Song) =>
        setSongs((state: Song[]) => {
            for (let i = 0; i < state.length; i++) {
                if (state[i].id === song.id) {
                    const newState = [...state];
                    newState.splice(i, 1);
                    newState.splice(0, 0, song);
                    return newState;
                }
            }

            return state;
        });

    const updateHistory = () => {
        axios.get("/api/playedsongs").then((response) => {
            setPlayedSongs(response.data);
        });
    };

    const onSongAdded = useCallback((message: ISocketMessage) => {
        addSong(message.data);
    }, []);

    const onSongUpdated = useCallback((message: ISocketMessage) => {
        setSongs((state: Song[]) => {
            for (let i = 0; i < state.length; i++) {
                if (state[i].id === message.data.id) {
                    const newState = [...state];
                    newState.splice(i, 1, message.data);
                    return newState;
                }
            }

            return state;
        });
    }, []);

    const onSongPlayed = useCallback((message: ISocketMessage) => {
        updateHistory();
        deleteSong(message.data);
    }, []);

    const onSongRemoved = useCallback((message: ISocketMessage) => {
        deleteSong(message.data);
    }, []);

    const onSongMoved = useCallback((message: ISocketMessage) => {
        moveSongToTop(message.data);
    }, []);

    const loadSongs = () => {
        axios.get("/api/songs").then((response) => {
            // Returned array might have gaps in index, these will be filled with null objects here.
            // We don't want that, so filter.
            setSongs(response.data.filter((obj: Song, i: number) => obj !== null));
        });
    };

    useEffect(loadSongs, []);
    useEffect(updateHistory, []);

    useEffect(() => {
        websocket.current = new WebsocketService(window.location.hostname, window.location.protocol);

        return () => {
            websocket.current?.close();
        };
    }, []);

    useEffect(() => {
        if (!websocket.current) {
            return;
        }
        websocket.current.onMessage(SocketMessageType.SongAdded, onSongAdded);
        websocket.current.onMessage(SocketMessageType.SongPlayed, onSongPlayed);
        websocket.current.onMessage(SocketMessageType.SongRemoved, onSongRemoved);
        websocket.current.onMessage(SocketMessageType.SongMovedToTop, onSongMoved);
        websocket.current.onMessage(SocketMessageType.SongUpdated, onSongUpdated);
    }, [onSongAdded, onSongPlayed, onSongRemoved, onSongMoved, onSongUpdated]);

    const onSongDeleted = (rowsDeleted: Song[]) => {
        axios.post("/api/songs/delete", { songs: rowsDeleted }).then(() => {
            rowsDeleted.forEach((song: Song) => deleteSong(song));
        });
    };

    const onSongCompleted = (rowsDeleted: Song[]) => {
        axios.post("/api/songs/complete", { songs: rowsDeleted }).then(() => {
            rowsDeleted.forEach((song: Song) => deleteSong(song));
        });
    };

    const onSongMovedToTop = (rowsMoved: Song[]) => {
        axios.post("/api/songs/movetotop", { songs: rowsMoved }).then(() => {
            rowsMoved.forEach((song: Song) => moveSongToTop(song));
        });
    };

    const handleClose = (event: any, reason: SnackbarCloseReason) => {
        setSongRequestState({
            state: undefined
        });
    };

    const handleEditSongClose = async (doSave: boolean) => {
        if (doSave && editingSong) {
            editingSong.title = editingSongTitle;
            editingSong.cleanTitle = editingSongCleanTitle;
            editingSong.comments = editingSongComment;
            editingSong.requestedBy = editingSongRequester;
            editingSong.sourceUrl = editingSongUrl;

            setSongRequestState({state: "progress"});

            try {
                if (editingSong.id) {
                    await axios.post("/api/songs/edit", editingSong);
                } else {
                    const user = editingSongRequester ? editingSongRequester : userContext.user.username;
                    editingSong.requestSource = "Bot UI";
                    editingSong.requestSourceDetails = "Added by " + userContext.user.username;
                    await axios.post(`/api/songs/user/${user}`, editingSong);
                }
                setSongRequestState({state: "success"});
                loadSongs();
                setEditingSong(undefined);
            } catch (error :any) {
                // Keep dialog open here to allow for corrections
                setSongRequestState({
                    state: "failed",
                    message: error.response.data.error.message
                });
            }
        } else {
            setEditingSong(undefined);
        }
    };

    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setSelectedTab(newValue);
    };

    const handleDeleteConfirm = (doDelete: boolean) => {
        if (doDelete) {
            if ((songToDelete as Song[]).length)  {
                onSongDeleted(songToDelete as Song[])
             } else {
                onSongDeleted([ songToDelete as Song ]);
             }
        }
        setSongToDelete(undefined);
    };

    const confirmDeleteDialog = <Dialog open={songToDelete !== undefined} onClose={() => handleDeleteConfirm(false)}>
        <DialogTitle id="confirm-delete-dialog">
            {"Delete song request?"}
        </DialogTitle>
        <DialogActions>
            <Button variant="contained" startIcon={<Delete />} onClick={() => handleDeleteConfirm(true)}>Delete</Button>
            <Button onClick={() => handleDeleteConfirm(false)} autoFocus>
            Cancel
            </Button>
        </DialogActions>
    </Dialog>;

    // Don't allow selecting songs for deletion without permission.
    const tableOptions: Options<Song> = { paging: false, actionsColumnIndex: 5, tableLayout: "auto", showTitle: false };
    let tableActions: (Action<Song> | ((rowData: Song) => Action<Song>))[] = [];
    if (userContext.user.userLevel >= UserLevels.Moderator) {
        tableActions = [
            {
                icon: "add",
                tooltip: "Add song",
                isFreeAction: true,
                onClick: (evt, data) => {
                    const newSong = {} as Song;
                    setEditingSong(newSong);
                    setEditingSongComment("");
                    setEditingSongRequester("");
                    setEditingSongTitle("");
                    setEditingSongCleanTitle("");
                    setEditingSongUrl("");
                }
            },
            rowData => ({
                icon: () => <VerticalAlignTop />,
                tooltip: "Move to top",
                hidden: songs.length > 0 && songs[0].id === rowData.id,
                onClick: (event, data) => (data as Song[]).length ? onSongMovedToTop(data as Song[]) : onSongMovedToTop([ data as Song ])
            }),
            rowData => ({
                icon: () => <Check />,
                tooltip: "Complete",
                hidden: songs.length > 0 && songs[0].id !== rowData.id,
                onClick: (evt, data) => (data as Song[]).length ? onSongCompleted(data as Song[]) : onSongCompleted([ data as Song ])
            }),
            {
                tooltip: "Remove",
                icon: "delete",
                onClick: (evt, data) => {
                    setSongToDelete(data);
                }
            },
            {
                tooltip: "Edit song",
                icon: "edit",
                onClick: (evt, data) => {
                    const song = data as Song;
                    if (song !== undefined) {
                        setEditingSong(song);
                        setEditingSongComment(song.comments);
                        setEditingSongRequester(song.requestedBy);
                        setEditingSongTitle(song.title);
                        setEditingSongCleanTitle(song.cleanTitle ?? "");
                        setEditingSongUrl(song.sourceUrl);
                    }
                }
            }
        ];
    }

    // Find own requested songs and list them.
    const ownSongs: OwnRequest[] = [];
    for (const song of songs) {
        if (song.requestedBy === userContext.user.username) {
            ownSongs.push({
                index: songs.indexOf(song),
                song
            });
        }
    }

    const songRequestStatusBar = <Grid item xs={12}>
            <Snackbar open={songRequestState?.state === "success"} autoHideDuration={4000} onClose={handleClose}>
                <Alert onClose={(e) => handleClose(e, "clickaway")} severity="success">
                    Song request saved.
                </Alert>
            </Snackbar>
            { songRequestState?.state === "failed" ?
            <Snackbar open={true} autoHideDuration={4000} onClose={handleClose}>
                <Alert onClose={(e) => handleClose(e, "clickaway")} severity="error">
                    Song request cannot be saved: {songRequestState.message}
                </Alert>
            </Snackbar> : undefined}
        </Grid>;

    // Display only for known users, we can't indentify requests otherwise.
    const ownSongQueue = !userContext.user.username ? undefined :
        <Box mb={1} mt={2} key="own-queue">
            {ownSongs.length > 0 ?
            <Box mt={2}>
                <Typography variant="h6">
                    Your requests
                </Typography>
                <div className={classes.root}>
                   <ImageList rowHeight={140} cols={3} className={classes.gridList}>
                       {ownSongs.map((tile) => (
                           <ImageListItem key={tile.song.previewUrl}>
                               <img src={tile.song.previewUrl} alt={tile.song.title} style={{height: "100%"}} />
                               <ImageListItemBar
                                   title={tile.song.title}
                                   subtitle={<span>Position: {tile.index + 1}</span>}
                                   actionIcon={
                                       <IconButton href={tile.song.sourceUrl} className={classes.icon} target="_blank" rel="noopener noreferrer">
                                           <OpenInNew />
                                       </IconButton>
                                   }
                               />
                           </ImageListItem>
                       ))}
                   </ImageList >
                </div>
            </Box> : undefined}
            {songRequestStatusBar}
            <Divider />
        </Box>;

    const editSongDialog = <Dialog open={editingSong !== undefined} onClose={() => handleEditSongClose(false)} key="edit-dialog">
        <form onSubmit={(event) => {event.preventDefault(); handleEditSongClose(true);}}>
            <DialogTitle>{editingSong?.id ? "Edit Song" : "Add Song"}</DialogTitle>
            <DialogContent>
                <TextField autoFocus margin="dense" id="edit-title" label="Title" fullWidth variant="standard"
                    value={editingSongTitle} onChange={(e) => setEditingSongTitle(e.target.value)} />
                <TextField margin="dense" id="edit-clean-title" label="Clean title" fullWidth variant="standard"
                    value={editingSongCleanTitle} onChange={(e) => setEditingSongCleanTitle(e.target.value)} />
                <TextField margin="dense" id="edit-comment" label="Comments" fullWidth variant="standard" multiline
                    value={editingSongComment} rows={4} onChange={(e) => setEditingSongComment(e.target.value)} />
                <TextField margin="dense" id="edit-requester" label="Requested by" fullWidth variant="standard"
                    value={editingSongRequester} onChange={(e) => setEditingSongRequester(e.target.value)} />
                <TextField margin="dense" id="edit-url" label="URL" fullWidth variant="standard"
                    value={editingSongUrl} onChange={(e) => setEditingSongUrl(e.target.value)} />
            </DialogContent>
            <DialogActions>
                <Button type="submit"
                    startIcon={songRequestState?.state === "progress" ? <CircularProgress size={15} /> : undefined}
                    disabled={songRequestState?.state === "progress"}>
                    {songRequestState?.state === "progress" ? "" : "Save"}
                </Button>
                <Button onClick={() => handleEditSongClose(false)}>Cancel</Button>
            </DialogActions>
        </form>
      </Dialog>;

    const donationLinks = ownSongs.length === 0 && donationLinkUrl ?
        <Grid container style={{marginTop: "1em"}}>
           <Grid item>
               <Typography>
                   <Link href={donationLinkUrl} target="_blank" rel="noopener noreferrer">
                       <AttachMoney /> Donate for your song request
                   </Link>
               </Typography>
           </Grid>
       </Grid>
      : undefined;

    const queueColumns: Column<Song>[] = [
        {
            title: "Song Title",
            field: "title",
            render: rowData => DetailCell({value: rowData, onPlaySong: props.onPlaySong}),
            sorting: false,
            width: "50%"
        },
        {
            title: "Requested By",
            field: "requestedBy",
            render: rowData => RequestUserTimeCell(rowData),
            align: "left",
            sorting: false,
            width: "20%"
        },
        {
            title: "Source",
            field: "requestSource",
            render: rowData => RequestSourceCell(rowData),
            sorting: false,
            width: "20%"
        }
    ];

    if (userContext.user.userLevel >= UserLevels.Moderator) {
        queueColumns.splice(1, 0,
        {
            title: "Comments",
            field: "comments",
            render: rowData => <div style={{maxWidth: "20em"}}>{rowData.comments}</div>,
            width: "20%",
        });
    }

    const elements = [];

    switch (selectedTab) {
        case 0:
            elements.push(ownSongQueue);
            elements.push(donationLinks);
            elements.push(editSongDialog);
            elements.push(confirmDeleteDialog);
            elements.push(<MaterialTable
                key="full-queue"
                title = "Song Queue"
                columns = {queueColumns}
                options = {tableOptions}
                data = {songs}
                components={{
                    Container: p => <Paper {...p} elevation={0} className={classes.table} />
                }}
                actions={tableActions}
            />);
            break;

        case 1:
            elements.push(<MaterialTable
                title = "Recently requested and played"
                columns = {[
                    {
                        title: "Song Title",
                        field: "title",
                        render: rowData => DetailCell({value: rowData, onPlaySong: props.onPlaySong}),
                        sorting: false,
                        width: "70%"
                    },
                    {
                        title: "Requested By",
                        field: "requestedBy",
                        align: "left",
                        sorting: false,
                        width: "15%",
                    },
                    {
                        title: "Request date",
                        field: "requestTime",
                        render: rowData => RequestDateCell(rowData),
                        sorting: false,
                        width: "15%"
                    },
                ]}
                options = {{...tableOptions, paging: true, search: false, toolbar: false, pageSize: 10}}
                data = {playedSongs}
                components={{
                    Container: p => <Paper {...p} elevation={0} className={`${classes.requestHistory} ${classes.table}`} />
                }}
            />);
            break;

        case 2:
            elements.push(<SongHistory />);
            break;
    }

    return (
        <Box>
            <Tabs
                value={selectedTab}
                indicatorColor="primary"
                textColor="primary"
                onChange={handleTabChange}>
                <Tab label="Song Queue" />
                <Tab label="Recently Played" />
                <Tab label="Request History" />
            </Tabs>
            {elements}
        </Box>
    );
};

export default SongQueue;
