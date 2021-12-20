import React from "react";
import Song from "./song";

const RequestDateCell: React.FC<any> = (value: Song) => {
    const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short", weekday: "short" });

    return (
        <span>
            {dateFormat.format(value?.requestTime)}
        </span>
    );
};

export default RequestDateCell;
