import React, { useContext, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import {
    Grid, TextField, Box, Card, Accordion, AccordionSummary, Typography, AccordionDetails,
    Icon, Tabs, Tab, Paper, InputAdornment, LinearProgress, TableContainer, Table, TableCell, TableRow, TableHead, TableBody, IconButton
} from "@material-ui/core";
import Search from "@material-ui/icons/Search";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import StarIcon from "@material-ui/icons/Star";
import StarOutlineIcon from "@material-ui/icons/StarOutline";
import { UserContext } from "../../contexts/userContext";

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
    type RowData = {
        id: number, title: string, album: string, genre: string, artist: string, created: number, attributedUserId?: number,
        attributedUsername: string, categoryId?: number, favoriteId?: number
    };
    type CategoryData = { id: number, name?: string, sortOrder?: number };

    const classes = useStyles();
    const userContext = useContext(UserContext);
    const [songlist, setSonglist] = useState([] as RowData[]);
    const [songlistNew, setSonglistNew] = useState([] as RowData[]);
    const [songlistFiltered, setSonglistFiltered] = useState<RowData[] | undefined>(undefined);
    const [selectedTab, setSelectedTab] = useState<CategoryData>();
    const [selectedTabBeforeSearch, setSelectedTabBeforeSearch] = useState<CategoryData>();
    const [searchText, setSearchText] = useState("");
    const [topLevelCategories, setTopLevelCategories] = useState([] as CategoryData[]);
    const TabNew = { id: 0 } as CategoryData;
    const TabSearch = { id: -1 } as CategoryData;
    const TabFavorite = { id: -2 } as CategoryData;

    const selectTab = (newList: RowData[], fullList: RowData[], category: CategoryData) => {
        setSelectedTab(category);
        if (category.id === TabNew.id) {
            setSonglistFiltered(newList);
        } else if (category.id === TabFavorite.id) {
            setSonglistFiltered(fullList.filter(x => x.favoriteId));
        } else {
            setSonglistFiltered(fullList.filter(x => x.categoryId === category.id));
        }
    };

    useEffect(() => {
        let genres: CategoryData[];
        axios.get("/api/songlist/categories").then((response) => {
            genres = response.data as CategoryData[];
            setTopLevelCategories(genres);
        }).then((r) => {
            axios.get("/api/songlist").then((response) => {
                const results = response.data as RowData[];

                // Show new songs (14 days) in a separate category.
                const twoWeeksAgo = new Date();
                twoWeeksAgo.setDate(-14);
                const newSongs = results.filter(row => row.created > twoWeeksAgo.getTime());

                setSonglist(results);
                setSonglistNew(newSongs);

                if (genres.length > 0) {
                    selectTab(songlistNew, results, genres[0]);
                }
            });
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

    const handleTabChange = (event: React.ChangeEvent<{}>, categoryId: number) => {
        selectTab(songlistNew, songlist, { id: categoryId });
    };

    const handleSearchChange = (event: any) => {
        setSearchText(event.target.value);

        if (event.target.value) {
            setSelectedTabBeforeSearch(selectedTab);
            setSelectedTab(TabSearch);
            const searchSubject = event.target.value.toLowerCase();
            setSonglistFiltered(songlist.filter(x => x.genre.toLowerCase().includes(searchSubject)
                || x.album.toLowerCase().includes(searchSubject)
                || x.artist?.toLowerCase().includes(searchSubject)
                || x.title.toLowerCase().includes(searchSubject)));
        } else if (selectedTabBeforeSearch) {
            selectTab(songlistNew, songlist, selectedTabBeforeSearch);
        }
    }

    const handleCopyClick = (row: RowData) => {
        copyTextToClipboard(row.album + " - " + row.title);
    };


    const updateRowInList = (list: RowData[], row: RowData, updatedRow: RowData): RowData[] => {
        if (list) {
            const index = list.indexOf(row);
            if (index < 0) {
                return list;
            }

            const newData = [...list];
            newData?.splice(index, 1, updatedRow);
            return newData;
        } else {
            return list;
        }
    }

    const handleFavoriteClick = async (row: RowData) => {
        let updatedRow: RowData | undefined;

        try {
            if (row.favoriteId) {
                await axios.post("/api/songlist/unstar", row);
                updatedRow = {...row, favoriteId: 0};
            } else {
                await axios.post("/api/songlist/star", row);
                updatedRow = {...row, favoriteId: 1};
            }
        } catch (err) {
            return;
        }

        if (updatedRow) {
            if (songlistFiltered) {
                setSonglistFiltered(updateRowInList(songlistFiltered, row, updatedRow));
            }
            setSonglistNew(updateRowInList(songlistNew, row, updatedRow));
            setSonglist(updateRowInList(songlist, row, updatedRow));
        }
    };

    // Show loading animation while data is being loaded.
    if (!songlistFiltered) {
        return <Box>{songrequestRules}<Card><Box p={5}><LinearProgress /></Box></Card></Box>;
    }

    // Some categories might not have data for "origin" (pop songs for example),
    // so don't waste space with an empty column.
    const hasOrigin = songlistFiltered.some(x => x.album);
    const showGenre = selectedTab === undefined || selectedTab.id <= 0;
    let lastOrigin = "";

    return <Box>
            {songrequestRules}
            <Card>
                <Grid container>
                    <Grid item xs>
                        <Tabs
                            value={selectedTab?.id}
                            indicatorColor="primary"
                            textColor="primary"
                            onChange={handleTabChange}>
                            {songlistNew.length > 0 ? <Tab className={classes.categoryTab} label={`📢 New (${songlistNew.length})`} value={TabNew.id} /> : undefined}
                            {topLevelCategories.map(x => <Tab className={classes.categoryTab} label={x.name} value={x.id} />)}
                            {songlist.some(x => x.favoriteId) ? <Tab className={classes.categoryTab} label={<StarIcon />} aria-label="Favorite songs" value={TabFavorite.id} title="Favorite songs" /> : undefined}
                            {searchText ? <Tab className={classes.categoryTab} label={"Search"} value={TabSearch.id} /> : undefined}
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

                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {hasOrigin ? <TableCell>Origin</TableCell> : undefined}
                                <TableCell>Title</TableCell>
                                <TableCell>Artist</TableCell>
                                {showGenre ? <TableCell>Genre</TableCell> : undefined}
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                        {songlistFiltered.map((row) => (
                            <TableRow key={row.id}>
                                {hasOrigin ? <TableCell component="th" scope="row">{lastOrigin === row.album ? "" : (lastOrigin = row.album)}</TableCell> : undefined}
                                <TableCell>{row.title}</TableCell>
                                <TableCell>{row.artist}</TableCell>
                                {showGenre ? <TableCell>{row.genre}</TableCell> : undefined}
                                <TableCell align="right">
                                    <Grid justify="flex-end" container wrap={"nowrap"}>
                                        <IconButton onClick={() => handleCopyClick(row)} color="primary" aria-label="Copy to clipboard" component="span" style={{padding: 0}}>
                                            <Icon>content_copy</Icon>
                                        </IconButton>
                                        {userContext.user.id ?
                                        <IconButton onClick={() => handleFavoriteClick(row)} color="primary" aria-label="Mark as favorite" component="span" style={{padding: 0, paddingLeft: 3}}>
                                            {row.favoriteId ? <StarIcon /> : <StarOutlineIcon />}
                                        </IconButton> : undefined}
                                    </Grid>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
    </Box>;
};

export default SongList;
