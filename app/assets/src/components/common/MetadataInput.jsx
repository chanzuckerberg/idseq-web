import React from "react";
import PropTypes from "prop-types";
import { isArray } from "lodash/fp";
import cx from "classnames";

import Input from "~/components/ui/controls/Input";
import Dropdown from "~/components/ui/controls/dropdowns/Dropdown";
import GeoSearchInputBox, {
  processLocationSelection,
} from "~/components/ui/controls/GeoSearchInputBox";
import AlertIcon from "~ui/icons/AlertIcon";

import cs from "./metadata_input.scss";

class MetadataInput extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // Small warning below the input. Only used for Locations currently.
      warning: props.warning,
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.warning !== state.prevPropsWarning) {
      return {
        warning: props.warning,
        prevPropsWarning: props.warning,
      };
    }
    return null;
  }

  render() {
    const {
      value,
      onChange,
      onSave,
      metadataType,
      className,
      isHuman,
    } = this.props;
    const { warning } = this.state;

    if (isArray(metadataType.options)) {
      const options = metadataType.options.map(option => ({
        text: option,
        value: option,
      }));
      return (
        <Dropdown
          fluid
          floating
          options={options}
          onChange={val => onChange(metadataType.key, val, true)}
          value={value}
          className={className}
          usePortal
          withinModal={this.props.withinModal}
        />
      );
    } else if (metadataType.dataType === "date") {
      return (
        <Input
          className={className}
          onChange={val => onChange(metadataType.key, val)}
          onBlur={() => onSave && onSave(metadataType.key)}
          value={value}
          placeholder={isHuman ? "YYYY-MM" : "YYYY-MM-DD"}
          type="text"
        />
      );
    } else if (metadataType.dataType === "location") {
      return (
        <React.Fragment>
          <GeoSearchInputBox
            className={className}
            inputClassName={cx(warning && "warning")}
            // Calls save on selection
            onResultSelect={({ result: selection }) => {
              const { result, warning } = processLocationSelection(
                selection,
                isHuman
              );
              onChange(metadataType.key, result, true);
              this.setState({ warning });
            }}
            value={value}
          />
          {warning && (
            <div className={cs.warning}>
              <div className={cs.icon}>
                <AlertIcon />
              </div>
              <div>{warning}</div>
            </div>
          )}
        </React.Fragment>
      );
    } else {
      return (
        <Input
          className={className}
          onChange={val => onChange(metadataType.key, val)}
          onBlur={() => onSave && onSave(metadataType.key)}
          value={value}
          type={metadataType.dataType === "number" ? "number" : "text"}
        />
      );
    }
  }
}

MetadataInput.defaultProps = {
  warning: "",
};

MetadataInput.propTypes = {
  className: PropTypes.string,
  value: PropTypes.any,
  metadataType: PropTypes.shape({
    key: PropTypes.string,
    dataType: PropTypes.oneOf(["number", "string", "date", "location"]),
    options: PropTypes.arrayOf(PropTypes.string),
  }),
  // Third optional parameter signals to the parent whether to immediately save. false means "wait for onSave to fire".
  // This is useful for the text input, where the parent wants to save onBlur, not onChange.
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func,
  withinModal: PropTypes.bool,
  isHuman: PropTypes.bool,
  warning: PropTypes.string,
};

export default MetadataInput;
