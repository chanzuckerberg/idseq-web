import PropTypes from "prop-types";
import React from "react";
import PrimaryButton from "../controls/buttons/PrimaryButton";

const WizardContext = React.createContext({
  currentPage: 0,
  actions: {}
});

class Wizard extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentPage: 0
    };

    this.showPageInfo = this.props.showPageInfo || true;
    this.skipPageInfoNPages = this.props.skipPageInfoNPages || 0;

    this.handleBackClick = this.handleBackClick.bind(this);
    this.handleContinueClick = this.handleContinueClick.bind(this);
    this.handleFinishClick = this.handleFinishClick.bind(this);
  }

  static getDerivedStateFromProps(newProps, prevState) {
    if (newProps.defaultPage !== prevState.lastDefaultPage) {
      return {
        lastDefaultPage: newProps.defaultPage,
        currentPage: newProps.defaultPage
      };
    }
  }

  handleBackClick() {
    if (this.state.currentPage > 0) {
      this.setState({ currentPage: this.state.currentPage - 1 });
    }
  }

  handleContinueClick() {
    if (this.state.currentPage < this.props.children.length - 1) {
      this.setState({ currentPage: this.state.currentPage + 1 });
    }
  }

  handleFinishClick() {
    console.log(this.props);
    this.props.onComplete();
  }

  render() {
    const currentPage = this.props.children[this.state.currentPage];

    const wizardActions = {
      continue: this.handleContinueClick,
      back: this.handleBackClick,
      finish: this.handleFinishClick
    };

    console.log("Wizard::render rendering", this.props.children, currentPage);
    return (
      <WizardContext.Provider
        value={{ currentPage: this.state.currentPage, actions: wizardActions }}
      >
        <div className="wizard">
          <div className="wizard__header">
            <div className="wizard__header__title">
              {currentPage.props.title || this.props.title}
            </div>
            {this.showPageInfo && (
              <div className="wizard__header__page">
                {this.state.currentPage >= this.skipPageInfoNPages
                  ? `${this.state.currentPage -
                      this.skipPageInfoNPages +
                      1} / ${this.props.children.length -
                      this.skipPageInfoNPages}`
                  : "\u00A0"}
              </div>
            )}
          </div>
          <div className="wizard__page">{currentPage}</div>
          {!currentPage.props.skipDefaultButtons && (
            <div className="wizard__nav">
              <PrimaryButton
                text="Back"
                disabled={this.state.currentPage <= 0}
                onClick={this.handleBackClick}
              />
              {this.state.currentPage < this.props.children.length - 1 && (
                <PrimaryButton
                  text="Continue"
                  onClick={this.handleContinueClick}
                />
              )}
              {this.state.currentPage == this.props.children.length - 1 && (
                <PrimaryButton text="Finish" onClick={this.handleFinishClick} />
              )}
            </div>
          )}
        </div>
      </WizardContext.Provider>
    );
  }
}

class Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    console.log("Wizard.Page::constructor");

    if (this.props.onLoad) {
      console.log("Wizard.Page::constructor onLoad");
      this.props.onLoad();
    }
  }

  static getDerivedStateFromProps(props, state) {
    console.log("Wizard.Page::getDerivedStateFromProps", props, state);
    return null;
  }

  render() {
    console.log("Wizard.Page::render children", this.props.children);
    return React.Children.toArray(this.props.children);
  }
}

// const Page = ({ children, onLoad }) => {
//   if (onLoad) { onLoad(); }
//   console.log("Wizard.Page::rendering page", children);
//   return children;
// };

Wizard.Page = Page;

const Action = ({ action, onAfterAction, children }) => {
  const handleOnClick = wizardAction => {
    wizardAction();

    if (onAfterAction) {
      onAfterAction();
    }
  };

  return (
    <WizardContext.Consumer>
      {({ actions }) => {
        return (
          <div onClick={() => handleOnClick(actions[action])}>{children}</div>
        );
      }}
    </WizardContext.Consumer>
  );
};

Action.propTypes = {
  action: PropTypes.oneOf(["back", "continue", "finish"]),
  children: PropTypes.element.isRequired,
  onAfterAction: PropTypes.func
};

Wizard.Action = Action;

Wizard.propTypes = {
  // children: PropTypes.oneOfType([
  //   PropTypes.shape({
  //     type: Wizard.Page
  //   }),
  //   PropTypes.arrayOf(
  //     PropTypes.shape({
  //       type: Wizard.Page
  //     })
  //   )
  // ]).isRequired
};

export default Wizard;
