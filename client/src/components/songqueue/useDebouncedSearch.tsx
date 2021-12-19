import AwesomeDebouncePromise from "awesome-debounce-promise";
import { useState } from "react";
import { useAsync } from "react-async-hook";
import useConstant from "../../hooks/useConstant";

/**
 * Generic reusable hook (https://stackoverflow.com/questions/23123138/perform-debounce-in-react-js)
 * @param searchFunction Function that executes the search.
 */
function useDebouncedSearch(searchFunction: (...args: any[]) => any) {

    // Handle the input text state
    const [inputText, setInputText] = useState("");

    // Debounce the original search async function
    const debouncedSearchFunction = useConstant(() =>
      AwesomeDebouncePromise(searchFunction, 300)
    );

    // The async callback is run each time the text changes,
    // but as the search function is debounced, it does not
    // fire a new request on each keystroke
    const searchResults = useAsync(
      async () => {
        if (inputText.length === 0) {
          return [];
        } else {
          return debouncedSearchFunction(inputText);
        }
      },
      [debouncedSearchFunction, inputText]
    );

    // Return everything needed for the hook consumer
    return {
      inputText,
      setInputText,
      searchResults,
    };
};

export default useDebouncedSearch;
