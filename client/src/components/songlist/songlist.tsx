import React, { useEffect, useState } from "react";
import { makeStyles, createTheme } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from "material-table"
import {
    Grid, TextField, Box, Card, Accordion, AccordionSummary, Typography, AccordionDetails,
    Icon, Tabs, Tab, Paper, InputAdornment, ThemeProvider, LinearProgress
} from "@material-ui/core";
import Search from "@material-ui/icons/Search";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";

// Use "condensed" display for rows
const condensedTheme = createTheme({
    overrides: {
      MuiTableCell: {
        root: {
          padding: "0 16px",
        }
      },
      MuiIconButton: {
        root: {
          padding: "6px 8px",
        }
      }
    }
});

const useStyles = makeStyles((theme) => ({
    categoryTab: {
        minWidth: 0
    },
    searchInput: {
        marginRight: theme.spacing(2),
        marginTop: theme.spacing(1),
    },
    tableContainer: {
        marginTop: theme.spacing(2)
    }
}));

function fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
    } catch (err) {
        // Ignore
    }

    document.body.removeChild(textArea);
}

function copyTextToClipboard(text: string) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text);
}

const SongList: React.FC<any> = (props: any) => {
    type RowData = { id: number, title: string, album: string, genre: string, created: number, attributedUserId?: number, attributedUsername: string };

    const classes = useStyles();
    const [songlist, setSonglist] = useState([] as RowData[]);
    const [songlistNew, setSonglistNew] = useState([] as RowData[]);
    const [songlistFiltered, setSonglistFiltered] = useState<RowData[] | undefined>(undefined);
    const [selectedTab, setSelectedTab] = useState(1);
    const [selectedTabBeforeSearch, setSelectedTabBeforeSearch] = useState(0);
    const [searchText, setSearchText] = useState("");
    const [topLevelCategories, setTopLevelCategories] = useState([] as string[])

    const selectTab = (tab: number, newList: RowData[], fullList: RowData[], genre: string) => {
        setSelectedTab(tab);
        if (tab === 0) {
            setSonglistFiltered(newList);
        } else {
            setSonglistFiltered(fullList.filter(x => x.genre === genre));
        }
    };

    useEffect(() => {
        axios.get("/api/songlist").then((response) => {
            const results  = response.data as RowData[];

            // Show new songs (14 days) in a separate category.
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(-14);
            const newSongs = results.filter(row => row.created > twoWeeksAgo.getTime());

            const genres = results.map(x => x.genre).filter((v, i, a) => a.indexOf(v) === i);
            genres.splice(0, 0, `📢 New (${newSongs.length})`);

            setSonglist(results);
            setSonglistNew(newSongs);
            setTopLevelCategories(genres);
            if (genres.length > 1) {
                selectTab(1, newSongs, results, genres[1]);
            }
        });
    }, []);

    const songrequestRules = (<Box mb={2}>
        <Accordion defaultExpanded={true}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Rules when requesting songs</Typography>
            </AccordionSummary>
            <AccordionDetails>
            <div>
                <ul>
                    <li>Songs can be requested during medleys or song suggestion sections (usually after live-learns are done). </li>
                    <li>To suggest, just post the title in chat (no links please). You can copy to clipboard using the <Icon fontSize={"small"}>content_copy</Icon> icon in each row.</li>
                    <li>Feel free to ask multiple times if your song is not played, but don't spam.</li>
                    <li>If Chewie continues to ignore your suggestion during medley, he might have forgotten how to play it temporarily. Try again another time!</li>
                </ul>
            </div>
            </AccordionDetails>
        </Accordion>
    </Box>);

    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        selectTab(newValue, songlistNew, songlist, topLevelCategories[newValue]);
    };

    const handleSearchChange = (event: any) => {
        setSearchText(event.target.value);

        if (event.target.value) {
            setSelectedTabBeforeSearch(selectedTab);
            setSelectedTab(topLevelCategories.length);
            const searchSubject = event.target.value.toLowerCase();
            setSonglistFiltered(songlist.filter(x => x.genre.toLowerCase().includes(searchSubject) || x.album.toLowerCase().includes(searchSubject) || x.title.toLowerCase().includes(searchSubject)));
        } else {
            selectTab(selectedTabBeforeSearch, songlistNew, songlist, topLevelCategories[selectedTabBeforeSearch]);
        }
    }

    // Show loading animation while data is being loaded.
    if (!songlistFiltered) {
        return <Box>{songrequestRules}<Card><Box p={5}><LinearProgress /></Box></Card></Box>;
    }

    return <Box>
            {songrequestRules}
            <Card>
                <Grid container>
                    <Grid item xs>
                        <Tabs
                            value={selectedTab}
                            indicatorColor="primary"
                            textColor="primary"
                            onChange={handleTabChange}>
                            {topLevelCategories.map(x => <Tab className={classes.categoryTab} label={x} />)}
                            {searchText ? <Tab className={classes.categoryTab} label={"Search"} /> : undefined}
                        </Tabs>
                    </Grid>
                    <Grid item>
                        <TextField
                            className={classes.searchInput}
                            id="search-input"
                            value={searchText}
                            onChange={handleSearchChange}
                            label=""
                            InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            )}}
                        />
                    </Grid>
                </Grid>

                <ThemeProvider theme={condensedTheme}>
                    <MaterialTable
                        columns = {[
                            { title: "Artist / Origin", field: "album", defaultSort: "asc" },
                            { title: "Title", field: "title" },
                            { title: "Genre", field: "genre", hidden: selectedTab > 0 && selectedTab < topLevelCategories.length }
                        ]}
                        options = {{
                            paging: false,
                            actionsColumnIndex: 3,
                            showTitle: false,
                            search: false,
                            toolbar: false
                        }}
                        actions={[
                            {
                                icon: "content_copy",
                                tooltip: "Copy to clipboard",
                                onClick: (event, rowData) => {
                                    if ((rowData as RowData).title !== undefined) {
                                        copyTextToClipboard((rowData as RowData).album + " - " + (rowData as RowData).title);
                                    }
                                }
                            }
                        ]}
                        data = {songlistFiltered}
                        components={{
                            Container: p => <Paper {...p} elevation={0} className={classes.tableContainer} />
                        }}
                    />
                </ThemeProvider>
            </Card>
    </Box>;
};

export default SongList;