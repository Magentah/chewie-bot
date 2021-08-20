import axios from "axios";
import { useEffect, useState } from "react";

/**
 * Custom hook for accessing public bot settings.
 * @returns Value of the setting when loaded (or undefined).
 */
function useSetting<S>(setting: string): S | undefined {
    const [value, setValue] = useState<S>();

    useEffect(() => {
        axios.get("/api/setting/" + setting).then((response) => {
            setValue(response.data);
        });
    }, [setting]);

    return value;
}

export default useSetting;