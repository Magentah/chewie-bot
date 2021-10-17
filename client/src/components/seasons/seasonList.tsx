import React, { useCallback, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import { Box, Typography, Grid, Card, Button, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from "@material-ui/core";
import MaterialTable from "material-table";

const useStyles = makeStyles((theme) => ({
    collectionHeader: {
        marginTop: theme.spacing(2)
    },
    achievementDescription: {
        marginTop: theme.spacing(1),
    },
    achievementsGrid: {
        background: theme.palette.divider,
        padding: theme.spacing(1),
        marginTop: theme.spacing(2)
    },
    noAchievementsGrid: {
        background: theme.palette.divider,
        padding: theme.spacing(15, 5),
        marginTop: theme.spacing(2)
    },
    uppercase: {
        textTransform: "uppercase"
    },
}));

const DateCell: React.FC<any> = (date: number) => {
    return (
        <span>
            {date ? new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" }).format(new Date(date)): "(Ongoing)"}
        </span>
    );
};

type RowData = { id: number, startDate: Date, endDate: Date, plannedEndDate: string };

const SeasonList: React.FC<any> = (props: any) => {
    const [seasonList, setSeasonList] = useState([] as RowData[]);
    const [dialogOpen, setDialogOpen] = useState(false);

    const classes = useStyles();

    const updateSeasons = useCallback(() => {
        axios.get("/api/seasons").then((response) => {
            if (response) {
                setSeasonList(response.data);
            }
        });
    }, []);

    useEffect(() => updateSeasons(), [updateSeasons]);

    const handleCloseReset = (createSeason: boolean) => {
        setDialogOpen(false);

        if (createSeason) {
            axios.post("/api/seasons/add").then((result) => {
                updateSeasons();
            })
        }
    };

    return <Card>
        <Dialog open={dialogOpen} onClose={() => handleCloseReset(false)}>
            <DialogTitle>Start New Season</DialogTitle>
            <DialogContent>
                <DialogContentText>Do you want to start a new season?</DialogContentText>
                <DialogContentText>The following tasks will be performed:</DialogContentText>
                <ul>
                    <li>Reset and archive all users' points</li>
                    <li>Reset tax streak</li>
                    <li>Grant outstanding achievements</li>
                </ul>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => handleCloseReset(true)} color="primary" autoFocus>Start new season</Button>
                <Button onClick={() => handleCloseReset(false)}>Cancel</Button>
            </DialogActions>
        </Dialog>

        <Grid>
            <Grid item>
                <Box margin={2}>
                    <Button variant="contained" color="primary" onClick={() => setDialogOpen(true)}>Start/end season</Button>
                </Box>
            </Grid>
            <Grid item>
                <MaterialTable
                    title = {<Typography>This list shows all past seasons.</Typography>}
                    columns = {[
                        { title: "Number", field: "id", defaultSort: "desc", editable: "never" },
                        { title: "Start date", field: "startDate", type: "date", render: rowData => DateCell(rowData.startDate), editable: "never" },
                        { title: "End date", field: "endDate", type: "date", render: rowData => DateCell(rowData.endDate), editable: "never" },
                        { title: "Planned end", field: "plannedEndDate", editable: "always" }
                    ]}
                    options = {{
                        paging: false,
                        actionsColumnIndex: 4,
                        showTitle: true,
                        tableLayout: "auto",
                        search: false
                    }}
                    data = {seasonList}
                    editable = {
                        {
                            isEditable: rowData => true,
                            isDeletable: rowData => true,
                            onRowUpdate: (newData, oldData) => axios.post("/api/seasons", newData).then((result) => {
                                if (result.status === 200) {
                                    const newList = [...seasonList];
                                    //@ts-ignore
                                    const index = oldData?.tableData.id;
                                    newList[index] = newData;
                                    setSeasonList(newList);
                                }
                            })
                        }
                    }
                />
            </Grid>
        </Grid>
    </Card>;
};

export default SeasonList;
