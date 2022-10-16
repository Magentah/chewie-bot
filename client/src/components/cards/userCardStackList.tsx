import React, { useCallback, useContext, useEffect, useState } from "react";
import { makeStyles } from "tss-react/mui";
import axios from "axios";
import { Box, Button, Typography, Grid, Card, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Paper, PaperProps, Backdrop, Select, MenuItem, Theme, Autocomplete, TextField, useTheme } from "@mui/material";
import { Image } from "react-bootstrap";
import useSetting from "../../hooks/setting";
import Sparkles from "../common/sparkle";
import { UserContext } from "../../contexts/userContext";

const useStyles = makeStyles()((theme: Theme) => ({
    cardsCountBox: {
        fontWeight: "bold",
        fontSize: "0.9em",
    },
    cardsCountFont: {
        fontSize: theme.typography.h5.fontSize,
        textAlign: "center",
        width: "6em"
    },
    collectionHeader: {
        marginTop: theme.spacing(2)
    },
    cardsGrid: {
        background: theme.palette.divider,
        padding: theme.spacing(1),
        marginTop: theme.spacing(2)
    },
    noCardsGrid: {
        background: theme.palette.divider,
        padding: theme.spacing(15, 5),
        marginTop: theme.spacing(2)
    },
    individualCardCounter: {
        borderRadius: "1em",
        background: theme.palette.background.default,
        padding: theme.spacing(0.25, 1),
        marginBottom: theme.spacing(1)
    },
    individualCardCounterText: {
        fontSize: "0.9em",
        color: theme.palette.text.secondary
    },
    noCardsText: {
        textTransform: "uppercase"
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: "#fff",
    },
    uppercase: {
        textTransform: "uppercase",
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(-1)
    },
}));

type RowData = {
    // Base card info
    id?: number, name: string, setName: string, rarity: number, imageId: string, url: string,
    // Additional information for cards on the stack
    cardCount: number, upgradedName: string, upgradedImagId: string, upgradedMimeType: string
};

type SelectorData = {
    setName: string, cardCount: number, collectedCardCount: number
};

const UserCardStackList: React.FC<any> = (props: any) => {
    const [cardlist, setCardlist] = useState([] as RowData[]);
    const [selector, setSelector] = useState<SelectorData[]>();
    const [selectedSeason, setSelectedSeason] = useState("");
    const [cardcount, setCardcount] = useState(0);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [redeemInfoResultMsg, setRedeemInfoResultMsg] = useState("");
    const [cardViewUrl, setCardViewUrl] = useState("");
    const cardCost = useSetting<number>("card-redeem-cost");

    const { classes } = useStyles();
    const userContext = useContext(UserContext);
    const theme = useTheme();

    const updateCards = useCallback(async (currentSeason: string) => {
        const selectorResponse = await axios.get("/api/mycards/selector");
        if (selectorResponse) {
            const data: SelectorData[] = selectorResponse.data;
            setSelector(data);
            if (data.length > 0 && currentSeason === "") {
                setSelectedSeason(data[0].setName);
            } else {
                setSelectedSeason(currentSeason);
            }
        }

        const response = await axios.get("/api/mycards");
        if (response) {
            setCardlist(response.data.cards);
            setCardcount(response.data.count);
        }
    }, []);

    const handleCloseReset = (redeemCard: boolean) => {
        setResetDialogOpen(false);

        if (redeemCard) {
            axios.post("/api/redeemcard").then((result) => {
                if (result.status === 200) {
                    if (typeof result.data === "string") {
                        setRedeemInfoResultMsg(result.data);
                    } else {
                        setRedeemInfoResultMsg(`You got ${result.data.card.name}!`);
                        updateCards(selectedSeason);
                    }
                }
            })
        }
    };

    const handleChange = (event: any) => {
        setSelectedSeason(event.target.value);
    };

    useEffect(() => { updateCards(selectedSeason) }, [updateCards, selectedSeason]);

    function PaperComponent(paperProps: PaperProps) {
        return (
          <Paper {...paperProps} style={{overflow: "visible", paddingLeft: "4em", paddingRight: "1em", paddingBottom: "0.5em", minWidth: "30em"}} />
        );
    }

    const filteredCardList = cardlist.filter(x => !selectedSeason || x.setName === selectedSeason);

    return <Card>
            <Backdrop className={classes.backdrop} open={cardViewUrl !== ""} onClick={() => setCardViewUrl("")}>
                <Image src={cardViewUrl} alt={""} onClick={() => setCardViewUrl("")} style={{maxWidth: "90%", maxHeight: "90%"}} />
            </Backdrop>
            <Dialog open={redeemInfoResultMsg !== ""} onClose={() => setRedeemInfoResultMsg("")} PaperComponent={PaperComponent}>
                <DialogTitle>Redeem dango card</DialogTitle>
                <DialogContent style={{overflow: "visible"}}>
                    <Image src={"/assets/Dango-Treasure-Box.png"} alt="" style={{marginLeft: "-11em", marginTop: "-9em", width:"10em", position: "absolute", zIndex: 100}} />
                    <DialogContentText>{redeemInfoResultMsg}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRedeemInfoResultMsg("")} color="primary" autoFocus>Close</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={resetDialogOpen} onClose={() => handleCloseReset(false)} PaperComponent={PaperComponent}>
                <DialogTitle>Get a Random Dango Card</DialogTitle>
                <DialogContent style={{overflow: "visible"}}>
                    <Image src={"/assets/Dango-Card-Pop-Up.png"} alt="" style={{marginLeft: "-11em", marginTop: "-9em", width:"12em", position: "absolute", zIndex: 100}} />
                    {userContext.user.username ?
                    <Typography>Would you like to trade {cardCost} chews for a random dango card?</Typography>
                    :<Typography>You need to be logged in to start collecting dango cards!</Typography>}
                </DialogContent>
                {userContext.user.username ?
                <DialogActions>
                    <Button onClick={() => handleCloseReset(true)} color="primary" autoFocus>Trade</Button>
                    <Button onClick={() => handleCloseReset(false)} color="primary">Cancel</Button>
                </DialogActions> :
                <DialogActions>
                    <Button onClick={() => handleCloseReset(false)} color="primary">OK</Button>
                </DialogActions>}
            </Dialog>
            <Grid>
                <Box padding={3} pt={1}>
                    <Grid item>
                        <Grid item container>
                            <Grid item className={classes.cardsCountBox}>
                                <Box paddingRight={2} paddingBottom={1}>
                                    <Autocomplete 
                                        sx={{ width: 250 }}
                                        openOnFocus
                                        options={cardlist.sort((a, b) => -b.setName.localeCompare(a.setName))}
                                        groupBy={(option) => option.setName}
                                        getOptionLabel={(option) => option.name}
                                        onChange={(e, newValue) => { if (newValue) { setSelectedSeason(newValue.setName) } }}
                                        renderOption={(props, option) => (
                                            <Box component="li" {...props}>
                                                {option.upgradedName ? option.upgradedName : option.name} (× {option.cardCount})
                                            </Box>
                                        )}
                                        renderInput={(params) => (
                                            <TextField
                                            {...params}
                                            label={`Cards collected: ${cardlist.length} / ${cardcount}`}
                                            InputLabelProps={{ style: {color: "black"} }}
                                            inputProps={{
                                                ...params.inputProps,
                                                style: {"color": theme.palette.text.primary },
                                                autoComplete: 'new-password', // disable autocomplete and autofill
                                            }}
                                            />
                                        )}
                                        />
                                </Box>
                            </Grid>
                            {selector && selector.length ?
                            <Grid item>
                                <Box mt={2}>
                                    <Select
                                        id="season-selector"
                                        value={selectedSeason}
                                        label="Set"
                                        onChange={handleChange}>
                                        {selector.map((set) => <MenuItem key={"set-" + set.setName} value={set.setName}>{`${set.setName} (${set.collectedCardCount} / ${set.cardCount} collected)`}</MenuItem>)}
                                    </Select>
                                </Box>
                            </Grid> : undefined}
                            <Grid item xs />
                            <Grid item>
                                <Box mt={2}>
                                    {cardCost ? <Button variant="contained" color="primary" onClick={() => setResetDialogOpen(true)}>Get a dango card</Button> : undefined}
                                </Box>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item>
                        {cardlist.length === 0 ?
                        <Box className={classes.noCardsGrid} padding={15}>
                            <Grid>
                                <Grid item>
                                    <Typography align="center" variant="h6" className={classes.noCardsText} style={{marginBottom: "2em"}}>You don't have any cards yet</Typography>
                                </Grid>
                                {cardCost ?
                                <Grid item>
                                    <Typography align="center" className={classes.noCardsText}>You can trade {cardCost} chews for a random dango card!</Typography>
                                </Grid> : undefined}
                            </Grid>
                        </Box> :
                        <Grid>
                            <Grid item>
                                {filteredCardList.length === 0 ?
                                <Box className={classes.noCardsGrid} padding={15}>
                                    <Grid>
                                        <Grid item>
                                            <Typography align="center" variant="h6" className={classes.noCardsText} style={{marginBottom: "2em"}}>{`You don't have any ${selectedSeason} cards yet`}</Typography>
                                        </Grid>
                                        {cardCost ?
                                        <Grid item>
                                            <Typography align="center" className={classes.noCardsText}>You can trade {cardCost} chews for a random dango card!</Typography>
                                        </Grid> : undefined}
                                    </Grid>
                                </Box> :
                                <Box flexWrap="wrap" display="flex" className={classes.cardsGrid}>
                                    {filteredCardList.map((tile: RowData) => (
                                    <Box m={1} key={tile.name}>
                                        <Grid>
                                            <Grid item>
                                                <Box display="flex" justifyContent="center">
                                                    <Box className={classes.individualCardCounter}>
                                                        <Typography className={classes.individualCardCounterText} align="center">× {tile.cardCount}</Typography>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid item>
                                                {tile.upgradedName ?
                                                <Sparkles>
                                                    <Image title={tile.name} height={250} src={tile.url} alt={tile.name} onClick={() => setCardViewUrl(tile.url)} style={{ cursor: "pointer" }} />
                                                </Sparkles> :
                                                <Image title={tile.name} height={250} src={tile.url} alt={tile.name} onClick={() => setCardViewUrl(tile.url)} style={{ cursor: "pointer" }} />}
                                            </Grid>
                                        </Grid>
                                    </Box>))}
                                </Box>}
                            </Grid>
                        </Grid>}
                    </Grid>
                </Box>
            </Grid>
    </Card>;
};

export default UserCardStackList;
