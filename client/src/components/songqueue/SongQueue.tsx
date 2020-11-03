import React, { useState, useEffect, useRef } from "react";
import MUIDataTable from "mui-datatables";
import { Image } from "react-bootstrap";
import { Grid, Typography, Box } from "@material-ui/core";
import { createMuiTheme, MuiThemeProvider } from "@material-ui/core/styles";
import WebsocketService, { SocketMessageType, ISocketMessage } from "../../services/websocketService";
import moment from "moment";
import axios from "axios";

type YTVideo = {
    idx: number;
    id: string;
    duration: string;
    name: string;
    channel: string;
};

const stubData = [
    {
        idx: 0,
        id: "CNRsiu5EeT4",
        duration: "3:27",
        name: "Raiden X 찬열 CHANYEOL - Yours (Feat. 이하이, 창모) Piano Cover",
        channel: "Chewie Melodies",
        requestedBy: "MagentaFall",
        requesterStatus: "Viewer",
        requesterVIPStatus: "None",
        requestedWith: "Donation",
    },
    {
        idx: 1,
        id: "I-vS4auhAjI",
        duration: "3:25",
        name: "아이유 (IU) - 에잇 / Eight (Prod. & Feat. SUGA) (Piano Cover)",
        channel: "Chewie Melodies",
        requestedBy: "MagentaFall",
        requesterStatus: "Subscriber",
        requesterVIPStatus: "Bronze",
        requestedWith: "Gold VIP",
    },
    {
        idx: 2,
        id: "CdAtlXL9tl0",
        duration: "3:47",
        name: "아이유 (IU) - Last Night Story / 어젯밤 이야기 (Piano Cover)",
        channel: "Chewie Melodies",
        requestedBy: "MagentaFall",
        requesterStatus: "Tier 2 Subscriber",
        requesterVIPStatus: "Silver",
        requestedWith: "Raffle",
    },
    {
        idx: 3,
        id: "2J-5uSvuags",
        duration: "1:19:20",
        name: "Jason Yang Violin X ChewieMelodies Collaboration Stream! Part 1 of 4",
        channel: "Chewie Melodies",
        requestedBy: "MagentaFall",
        requesterStatus: "Tier 3 Subscriber",
        requesterVIPStatus: "Gold",
        requestedWith: "Song List",
    },
];
const x: any = {
    MUIDataTableHeadCell: {
        root: {
            "&:nth-child(2)": {
                width: 150,
            },
        },
    },
};

const getMuiTheme = () => {
    return createMuiTheme({
        overrides: x,
    });
};

const PreviewCell: React.FC<any> = (value) => {
    const url = `https://img.youtube.com/vi/${value}/0.jpg`;
    return (
        <div className="Pog">
            <a href={`https://www.youtube.com/watch?v=${value}`}>
                <Image src={url} thumbnail />
            </a>
        </div>
    );
};

const DetailCell: React.FC<any> = (value) => {
    const duration = moment.utc(moment.duration(value.duration).asMilliseconds()).format("HH:mm:ss");
    return (
        <Grid style={{ marginBottom: 40 }}>
            <Grid item xs={12}>
                <Typography component="div">
                    <a href={`https://www.youtube.com/watch?v=${value?.sourceId}`}>{value?.title}</a>
                </Typography>
            </Grid>
            <Grid>
                <Typography component="div">
                    <Box fontStyle="italic" fontSize={14}>
                        Song Length: {duration}{" "}
                    </Box>
                </Typography>
            </Grid>
        </Grid>
    );
};

const RequesterCell: React.FC<any> = (value) => {
    return (
        <Typography component="div">
            <Box>{value}</Box>
        </Typography>
    );
};

const RequesterStatusCell: React.FC<any> = (value) => {
    return (
        <Grid>
            <Typography component="div" style={{ marginBottom: 20 }}>
                Status
                <Box fontStyle="italic" fontSize={14}>
                    {value?.viewerStatus}
                </Box>
            </Typography>
            <Typography component="div">
                VIP Status
                <Box fontStyle="italic" fontSize={14}>
                    {value?.vipStatus}
                </Box>
            </Typography>
        </Grid>
    );
};

const RequestedWithCell: React.FC<any> = (value) => {
    return (
        <Typography component="div">
            <Box>{value}</Box>
        </Typography>
    );
};

const columns = [
    {
        label: "Preview",
        name: "sourceId",
        options: { customBodyRender: PreviewCell },
    },
    {
        label: "Details",
        name: "details",
        options: {
            customBodyRender: DetailCell,
            filterOptions: {
                names: stubData.map((item) => {
                    return item.name;
                }),
                logic(prop: string, filters: any[]): boolean {
                    if (filters.length) {
                        return !filters.includes(stubData[Number.parseInt(prop)].name);
                    }
                    return false;
                },
            },
        },
    },
    {
        label: "Requested By",
        name: "requestedBy",
        options: {
            customBodyRender: RequesterCell,
            filterOptions: {
                names: Array.from(
                    new Set(
                        stubData.map((item) => {
                            return item.requestedBy;
                        })
                    )
                ),
                logic(index: string, filters: any[]): boolean {
                    if (filters.length) {
                        return !filters.includes(stubData[Number.parseInt(index)].requestedBy);
                    }
                    return false;
                },
            },
        },
    },
    {
        label: "Requester Status",
        name: "requesterStatus",
        options: {
            customBodyRender: RequesterStatusCell,
            filterOptions: {
                names: Array.from(
                    new Set(
                        stubData
                            .map((item) => {
                                return item.requesterStatus;
                            })
                            .concat(
                                stubData.map((otherItem) => {
                                    return otherItem.requesterVIPStatus;
                                })
                            )
                    )
                ),
                logic(index: string, filters: any[]): boolean {
                    if (filters.length) {
                        return (
                            !filters.includes(stubData[Number.parseInt(index)].requesterStatus) &&
                            !filters.includes(stubData[Number.parseInt(index)].requesterVIPStatus)
                        );
                    }
                    return false;
                },
            },
        },
    },
    {
        label: "Requested With",
        name: "requestSource",
        options: {
            customBodyRender: RequestedWithCell,
            filterOptions: {
                names: stubData.map((item) => {
                    return item.requestedWith;
                }),
                logic(index: string, filters: any[]): boolean {
                    if (filters.length) {
                        return !filters.includes(stubData[Number.parseInt(index)].requestedWith);
                    }
                    return false;
                },
            },
        },
    },
];

interface Song {
    details: {
        title: string;
        duration: moment.Duration;
        sourceId: string;
    };
    source: number;
    sourceId: string;
    duration: moment.Duration;
    requestedBy: string;
    requesterStatus: {
        viewerStatus: string;
        vipStatus: string;
    };
    requestSource: string;
}

const SongQueue: React.FC<{}> = (props) => {
    const [songs, setSongs] = useState<Song[]>([]);
    const websocket = useRef<WebsocketService | undefined>(undefined);

    const addSong = (newSong: Song) => setSongs((state: Song[]) => [...state, newSong]);
    const deleteSong = (songIndex: number) =>
        setSongs((state: Song[]) => {
            state.splice(songIndex, 1);
            return state;
        });

    const onSongAdded = (message: ISocketMessage) => {
        if (message.data && message.data.details && message.data.sourceId) {
            message.data.details.sourceId = message.data.sourceId;
        }
        console.log(`song added`);
        addSong(message.data);
    };

    useEffect(() => {
        websocket.current = new WebsocketService();

        return () => {
            websocket.current?.close();
        };
    }, []);

    useEffect(() => {
        if (!websocket.current) {
            return;
        }
        console.log(`songqueue websocket connected`);

        websocket.current.onMessage(SocketMessageType.SongAdded, onSongAdded);
    }, []);

    const onSongDeleted = (rowsDeleted: any) => {
        console.log(rowsDeleted);
        const indexes = rowsDeleted.data.map((song: any) => {
            return song.dataIndex;
        });

        const songsToDelete = songs.filter((song, index) => {
            return indexes.includes(index);
        });
        console.log(songsToDelete);
        axios.post("api/songs/delete", { songs: songsToDelete }).then((response) => {
            //
        });

        indexes.forEach((song: any) => {
            deleteSong(song);
        });
    };

    return (
        <MuiThemeProvider theme={getMuiTheme()}>
            <MUIDataTable
                title="Song Queue"
                data={songs}
                columns={columns}
                options={{ elevation: 0, download: false, print: false, onRowsDelete: onSongDeleted }}
            />
        </MuiThemeProvider>
    );
};

export default SongQueue;
