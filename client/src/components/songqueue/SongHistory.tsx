import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Grid, Input, InputLabel, Link, makeStyles, Paper } from "@material-ui/core";
import axios from "axios";
import MaterialTable from "@material-table/core";
import useDebouncedSearch from "./useDebouncedSearch";
import RequestDateCell from "./RequestDateCell";
import Song from "./song";

const useStyles = makeStyles((theme) => ({
    requestHistory: {
        margin: theme.spacing(0),
    },
    table: {
        "& tbody tr:last-child td": {
          border: 0
        }
      }
}));

interface SongHistory {
    title: string
    requestedBy: string,
    requestSource: string,
    songSource: string
    url: string
}

const DetailCellHistory: React.FC<{value: SongHistory}> = (props) => {
    return <span>
        <Link href={props.value.url} target="_blank" rel="noopener noreferrer">
            {props.value.title}
        </Link>
    </span>;
}

const SongHistory: React.FC = (props) => {
    const classes = useStyles();

    const [playedSongs, setPlayedSongs] = useState<SongHistory[]>([]);
    const [totalResults, setTotalResults] = useState<number>(0);

    useEffect(() => {
        axios.get("/api/playedsongs").then((response) => {
            const songs: Song[] = response.data;
            setPlayedSongs(songs.map(x => { return { title: x.details.title, requestedBy: x.requestedBy, requestSource: x.requestSource, url: x.linkUrl, songSource: x.details.source }}));
        });
    }, []);

    const searchSongHistoryAsync = async (text: string): Promise<SongHistory[]> => {
        const result = (await axios.get("/api/songs/history", { params: { search: text, limit: 20 }}))?.data;
        setTotalResults(result.count);
        return result.songs;
    };

    const useSearchRequestHistory = () => useDebouncedSearch(text => searchSongHistoryAsync(text));
    const { inputText, setInputText, searchResults } = useSearchRequestHistory();

    return (<React.Fragment>
            <Box mb={2} mt={1} ml={1}>
                <Grid container alignItems="center">
                    <Grid item><InputLabel style={{marginBottom: 0, marginRight: "1em"}}>Search:</InputLabel></Grid>
                    <Grid item><Input id="search-history" value={inputText} onChange={e => setInputText(e.target.value)} /></Grid>
                    {searchResults.loading && <Grid item><Box ml={1}><CircularProgress size={20} /></Box></Grid>}
                </Grid>
            </Box>
            <MaterialTable
                    title = "Song Request History"
                    columns = {[
                        {
                            title: "Song Title",
                            field: "title",
                            width: "70%",
                            render: rowData => DetailCellHistory({value: rowData}),
                        },
                        {
                            title: "Requested By",
                            field: "requestedBy",
                            align: "left",
                            width: "15%",
                        },
                        {
                            title: "Request time",
                            field: "requestTime",
                            render: rowData => RequestDateCell(rowData),
                            width: "15%"
                        },
                    ]}
                    options = {{tableLayout: "auto", showTitle: false, search: false, toolbar: false, padding: "dense", pageSize: 10}}
                    data = {inputText && searchResults.result ? searchResults.result as SongHistory[] : playedSongs}
                    components={{
                        Container: p => <Paper {...p} elevation={0} className={`${classes.requestHistory} ${classes.table}`} />
                    }}
            />
            {searchResults?.result?.length && totalResults > searchResults.result.length ? <Box mt={1}><span>Showing {searchResults.result.length} results of {totalResults}</span></Box> : undefined}
        </React.Fragment>);
}

export default SongHistory;
