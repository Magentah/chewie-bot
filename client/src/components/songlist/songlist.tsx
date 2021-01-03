import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from 'material-table'

const useStyles = makeStyles((theme) => {
    return {};
});

const SongList: React.FC<any> = (props: any) => {
    const classes = useStyles();
    const [songlist, setSonglist] = useState([]);

    useEffect(() => {
        axios.get("/api/songlist").then((response) => {
            setSonglist(response.data);
        });
    }, []);

    return <div>
            <MaterialTable
                columns = {[
                    { title: 'Album', field: 'album' },
                    { title: 'Title', field: 'title' },
                    { title: 'Genre', field: 'genre', defaultGroupOrder: 0, defaultGroupSort: "asc" }
                ]}
                options = {{
                    paging: false,
                    grouping: true,
                    defaultExpanded: true,
                    actionsColumnIndex: 3,
                    showTitle: false
                }}
                data = {songlist}
                editable = {{
                    isEditable: rowData => true,
                    isDeletable: rowData => true,
                    onRowAdd: newData => axios.post("/api/songlist/add", newData).then(() => {
                        setSonglist([...songlist, newData]);
                    }),
                    onRowUpdate: (newData, oldData) => axios.post("/api/songlist", newData).then(() => {
                        const newSonglist = [...songlist];
                        //@ts-ignore
                        const index = oldData?.tableData.id;
                        newSonglist[index] = newData;
                        setSonglist(newSonglist);
                    }),
                    onRowDelete: oldData => axios.post("/api/songlist/delete", oldData).then(() => {
                        const newSonglist = [...songlist];
                        //@ts-ignore
                        const index = oldData?.tableData.id;
                        newSonglist.splice(index, 1);
                        setSonglist(newSonglist);
                    })
                }}
            />
    </div>;
};

export default SongList;