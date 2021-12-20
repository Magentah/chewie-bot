import React from "react";
import { Box, CircularProgress, Grid, Input, InputLabel, Link, makeStyles, Paper } from "@material-ui/core";
import axios from "axios";
import MaterialTable, { Options } from "@material-table/core";
import useDebouncedSearch from "./useDebouncedSearch";
import RequestDateCell from "./RequestDateCell";

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

    const searchSongHistoryAsync = async (text: string): Promise<SongHistory[]> => {
        return (await axios.get("/api/songs/history", { params: { search: text }}))?.data;
    };

    const useSearchRequestHistory = () => useDebouncedSearch(text => searchSongHistoryAsync(text));
    const { inputText, setInputText, searchResults } = useSearchRequestHistory();

    const tableOptions: Options<SongHistory> = { paging: false, actionsColumnIndex: 5, tableLayout: "auto", showTitle: false };

    return (<React.Fragment>
            <Box mb={2} mt={1} ml={1}>
                <Grid container alignItems="center">
                    <Grid item><InputLabel style={{marginBottom: 0, marginRight: "1em"}}>Search:</InputLabel></Grid>
                    <Grid item><Input id="search-history" value={inputText} onChange={e => setInputText(e.target.value)} /></Grid>
                    {searchResults.loading && <Grid item><Box ml={1}><CircularProgress size={20} /></Box></Grid>}
                </Grid>
            </Box>
            {!searchResults.loading && <MaterialTable
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
                    options = {{...tableOptions, search: false, toolbar: false, padding: "dense"}}
                    data = {searchResults.result as SongHistory[]}
                    components={{
                        Container: p => <Paper {...p} elevation={0} className={`${classes.requestHistory} ${classes.table}`} />
                    }}
            />}
        </React.Fragment>);
}

export default SongHistory;
