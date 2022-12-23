import React, { useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "@material-table/core";

const DonationList: React.FC<any> = (props: any) => {
    type RowData = {username: string, date: Date, amount: number, message: string};

    const [donationlist, setDonationlist] = useState([] as RowData[]);

    useEffect(() => {
        axios.get("/api/donationlist").then((response) => {
            setDonationlist(response.data);
        });
    }, []);

    const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short", weekday: "short" });

    return <div>
            <MaterialTable
                columns = {[
                    { title: "Username", field: "username" },
                    {
                         title: "Date", field: "date", defaultGroupOrder: 0, defaultGroupSort: "asc", type: "date",
                         render: (rowData: any, type: 'row' | 'group') => <span>{dateFormat.format(new Date(type === "group" ? rowData : rowData.date))}</span>
                    },
                    { title: "Message", field: "message" },
                    { title: "Amount", field: "amount", type: "currency" }
                ]}
                options = {{
                    paging: false,
                    grouping: true,
                    defaultExpanded: false,
                    showTitle: false,
                    padding: "dense"
                }}
                data = {donationlist}
            />
    </div>;
};

export default DonationList;