import React, { useCallback, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import { Box, Button, Typography, Grid, Card, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Paper, PaperProps, Backdrop } from "@material-ui/core";
import { Image } from "react-bootstrap";
import * as Cookie from "js-cookie";
import useSetting from "../../hooks/setting";
import Sparkles from "../common/sparkle";

const useStyles = makeStyles((theme) => ({
    cardsCountBox: {
        textTransform: "uppercase",
        fontWeight: "bold",
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
        color: theme.palette.text.hint
    },
    noCardsText: {
        textTransform: "uppercase"
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: "#fff",
    },
}));

type RowData = {
    // Base card info
    id?: number, name: string, setName: string, rarity: number, imageId: string, url: string,
    // Additional information for cards on the stack
    cardCount: number, upgradedName: string, upgradedImagId: string, upgradedMimeType: string
};

const UserCardStackList: React.FC<any> = (props: any) => {
    const [cardlist, setCardlist] = useState([] as RowData[]);
    const [cardcount, setCardcount] = useState(0);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [redeemInfoResultMsg, setRedeemInfoResultMsg] = useState("");
    const [cardViewUrl, setCardViewUrl] = useState("");
    const cardCost = useSetting<number>("card-redeem-cost");

    const classes = useStyles();
    const userProfile = Cookie.getJSON("user");

    const updateCards = useCallback(() => {
        axios.get("/api/mycards").then((response) => {
            if (response) {
                setCardlist(response.data.cards);
                setCardcount(response.data.count);
            }
        });
    }, []);

    const handleCloseReset = (redeemCard: boolean) => {
        setResetDialogOpen(false);

        if (redeemCard) {
            axios.post("/api/redeemcard").then((result) => {
                if (result.status === 200) {
                    if (typeof result.data === "string") {
                        setRedeemInfoResultMsg(result.data);
                    } else {
                        setRedeemInfoResultMsg(`You got ${result.data.name}!`);
                        updateCards();
                    }
                }
            })
        }
    };

    useEffect(() => updateCards(), []);

    function PaperComponent(paperProps: PaperProps) {
        return (
          <Paper {...paperProps} style={{overflow: "visible", paddingLeft: "4em", paddingRight: "1em", paddingBottom: "0.5em", minWidth: "30em"}} />
        );
    }

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
                    {userProfile?.username ?
                    <Typography>Would you like to trade {cardCost} chews for a random dango card?</Typography>
                    :<Typography>You need to be logged in to start collecting dango cards!</Typography>}
                </DialogContent>
                {userProfile?.username ?
                <DialogActions>
                    <Button onClick={() => handleCloseReset(true)} color="primary" autoFocus>Trade</Button>
                    <Button onClick={() => handleCloseReset(false)} color="primary">Cancel</Button>
                </DialogActions> :
                <DialogActions>
                    <Button onClick={() => handleCloseReset(false)} color="primary">OK</Button>
                </DialogActions>}
            </Dialog>
            <Grid>
                <Box padding={3}>
                    <Grid item>
                        <Grid item container>
                            <Grid item className={classes.cardsCountBox}>
                                <Grid item>
                                    Dango cards collected so far
                                </Grid>
                                <Grid item>
                                    <Box border={2} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} className={classes.cardsCountFont}>
                                        {cardlist.length} / {cardcount}
                                    </Box>
                                </Grid>
                            </Grid>
                            <Grid item xs />
                            <Grid item>
                                {cardCost ? <Button variant="contained" color="primary" onClick={() => setResetDialogOpen(true)}>Get a dango card</Button> : undefined}
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
                        <Box flexWrap="wrap" display="flex" className={classes.cardsGrid}>
                            {cardlist.map((tile: RowData) => (
                            <Box m={1}><Grid key={tile.name}>
                                <Grid item>
                                    <Box display="flex" justifyContent="center">
                                        <Box className={classes.individualCardCounter}>
                                            <Typography className={classes.individualCardCounterText} align="center">× {tile.cardCount}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                                <Grid item>
                                    <Sparkles>
                                        <Image title={tile.name} height={250} src={tile.url} alt={tile.name} onClick={() => setCardViewUrl(tile.url)} style={{ cursor: "pointer" }} />
                                    </Sparkles>
                                </Grid>
                            </Grid></Box>
                            ))}
                        </Box>}
                    </Grid>
                </Box>
        </Grid>
    </Card>;
};

export default UserCardStackList;
