import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from "material-table"
import { Box, Button, Typography, Grid, Card, TextField, CircularProgress, FormControl, InputLabel, Select, MenuItem, GridList, GridListTile, GridListTileBar } from "@material-ui/core";
import { Image } from "react-bootstrap";
import { DropzoneArea, DropzoneDialog } from "material-ui-dropzone";
import { AddToListState } from "../common/addToListState";
import { Autocomplete } from "@material-ui/lab";
import AddIcon from "@material-ui/icons/Add";

const useStyles = makeStyles((theme) => ({
    redeemButton: {

    },
    gridList: {

    },
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
        padding: theme.spacing(1)
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
    }
}));

type RowData = { id?: number, name: string, setName: string, rarity: number, imageId: string, url: string, cardCount: number };

const ImageCell: React.FC<{value: RowData}> = ({value}) => {

    return <Grid container>
            <Grid item>
                <Image height={40} src={""} style={{ marginRight: "0.5em" }} />
            </Grid>
        </Grid>;
}

const UserCardStackList: React.FC<any> = (props: any) => {
    const [cardlist, setCardlist] = useState([] as RowData[]);
    const [cardListState, setCardListState] = useState<AddToListState>();

    const classes = useStyles();

    useEffect(() => {
        axios.get("/api/mycards").then((response) => {
            setCardlist(response.data);
        });
    }, []);

    return <Card>
            <Grid xs>
                <Box padding={3}>
                    <Grid item>
                        <Grid item container>
                            <Grid item className={classes.cardsCountBox}>
                                <Grid item>
                                    Dango cards collected so far
                                </Grid>
                                <Grid item>
                                    <Box border={2} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} className={classes.cardsCountFont}>
                                        4 / 24
                                    </Box>
                                </Grid>
                            </Grid>
                            <Grid item xs />
                            <Grid item>
                                <Button className={classes.redeemButton} variant="contained" color="primary">Get a dango card</Button>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item className={classes.collectionHeader}>
                        <Typography variant="h6">Your collection</Typography>
                    </Grid>
                    <Grid item>
                        <Box flexWrap="wrap" display="flex" className={classes.cardsGrid}>
                            {cardlist.map((tile) => (
                            <Box m={1}><Grid key={tile.name}>
                                <Grid item>
                                    <Box display="flex" justifyContent="center">
                                        <Box className={classes.individualCardCounter}>
                                            <Typography className={classes.individualCardCounterText} align="center">x {tile.cardCount}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                                <Grid item></Grid><Image height={250} src={tile.url} alt={tile.name} />
                            </Grid></Box>
                            ))}
                        </Box>
                    </Grid>
                </Box>
        </Grid>
    </Card>;
};

export default UserCardStackList;
