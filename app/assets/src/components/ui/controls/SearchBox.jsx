import React from "react";
import { Search } from "semantic-ui-react";
import { escapeRegExp, debounce } from "lodash";
import PropTypes from "prop-types";
import { get } from "../../../api";

class SearchBox extends React.Component {
  constructor(props) {
    super(props);

    this.delayCheckMatch = 1000;
    this.waitHandleSearchChange = 500;
    this.minChars = 2;

    this.placeholder = this.props.placeholder;

    this.resetComponent = this.resetComponent.bind(this);
    this.handleResultSelect = this.handleResultSelect.bind(this);

    this.blankState = { isLoading: false, results: [], value: "" };
    this.state = {
      isLoading: false,
      results: [],
      value: this.props.initialValue
    };
  }

  resetComponent() {
    this.setState(this.blankState);
  }

  handleResultSelect(e, { result }) {
    this.setState({ value: result.title });
    this.props.onResultSelect(e, { result });
  }

  findMatches = async query => {
    if (this.props.clientSearchSource) {
      const re = new RegExp(escapeRegExp(this.state.value), "i");
      const isMatch = result => re.test(result.title);
      return this.props.clientSearchSource.filter(isMatch);
    }
    if (this.props.serverSearchAction) {
      let result = await get(
        `/${this.props.serverSearchAction}?query=${query}`
      );
      return result;
    }
  };

  handleSearchChange = (e, { value }) => {
    this.setState({ isLoading: true, value });

    setTimeout(async () => {
      if (this.state.value.length < this.minChars) return this.resetComponent();

      let searchResults;
      if (this.props.clientSearchSource) {
        const re = new RegExp(escapeRegExp(this.state.value), "i");
        const isMatch = result => re.test(result.title);
        searchResults = this.props.clientSearchSource.filter(isMatch);
      } else if (this.props.serverSearchAction) {
        searchResults = await get(
          `/${this.props.serverSearchAction}?query=${this.state.value}`
        );
      }

      this.setState({
        isLoading: false,
        results: searchResults
      });
    }, this.delayCheckMatch);
  };

  render() {
    const { isLoading, value, results } = this.state;
    return (
      <Search
        className="idseq-ui input search"
        loading={isLoading}
        onSearchChange={debounce(
          this.handleSearchChange,
          this.waitHandleSearchChange,
          {
            leading: true
          }
        )}
        results={results}
        value={value}
        placeholder={this.placeholder}
        onResultSelect={this.handleResultSelect}
      />
    );
  }
}

SearchBox.propTypes = {
  // Provide either clientSearchSource or serverSearchAction.
  // If clientSearchSource is provided, query matching will happen on the client side (use for small data).
  // If serverSearchAction is provided, query matching will happen on the server side (use for large data).
  clientSearchSource: PropTypes.array,
  serverSearchAction: PropTypes.string,
  initialValue: PropTypes.string,
  onResultSelect: PropTypes.func,
  placeholder: PropTypes.string
};

export default SearchBox;
