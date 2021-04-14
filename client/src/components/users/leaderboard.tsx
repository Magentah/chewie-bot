import React, { useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "material-table"

type RowData = { username: string, points: number, rank: number };

const Leaderboard: React.FC<any> = (props: any) => {
    const [userlist, setUserlist] = useState([] as RowData[]);

    useEffect(() => {
        axios.get("/api/leaderboard").then((response) => {
            setUserlist(response.data);
        });
    }, []);


    return (
        <div>
            <MaterialTable
                columns = {[
                    { title: "Rank", field: "rank" },
                    { title: "User name", field: "username" },
                    { title: "Points", field: "points", cellStyle: { textAlign: "right" }, headerStyle: { textAlign: "right" } }
                ]}
                options = {{
                    paging: false,
                    showTitle: false,
                }}
                data = {userlist}
            />
        </div>
    );
};

export default Leaderboard;