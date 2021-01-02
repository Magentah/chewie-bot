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
                columns={[
                    { title: 'Album', field: 'album' },
                    { title: 'Title', field: 'title' },
                    { title: 'Genre', field: 'genre' }
                ]}
                options={{
                    paging: false
                }}
                data={songlist}
                title=""
            />
    </div>;
};

export default SongList;