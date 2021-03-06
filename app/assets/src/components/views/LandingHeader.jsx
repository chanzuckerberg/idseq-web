import PropTypes from "prop-types";
import React from "react";

import ExternalLink from "~ui/controls/ExternalLink";
import { LogoReversed } from "~ui/icons";
import TransparentButton from "../ui/controls/buttons/TransparentButton";

import cs from "./landing.scss";

const LandingHeader = ({ browserInfo }) => {
  const signInLink = () => {
    location.href = "/auth0/login";
  };
  return (
    <div className={cs.header}>
      <div className={cs.siteHeader}>
        <div className={cs.brandDetails}>
          <a href="/">
            <span className={cs.logoIcon}>
              <LogoReversed />
            </span>
          </a>
        </div>
        <div className={cs.fill} />
        <div className={cs.links}>
          <ExternalLink
            className={cs.headerLink}
            href="https://help.idseq.net"
            analyticsEventName="Landing_help-center-link_clicked"
          >
            Help Center
          </ExternalLink>
          <ExternalLink
            className={cs.headerLink}
            href="https://www.discoveridseq.com/vr"
            analyticsEventName="Landing_video-tour-link_clicked"
          >
            Video Tour
          </ExternalLink>
          <ExternalLink
            className={cs.headerLink}
            // Don't remove until all headcount for this role ID is filled.
            href="https://boards.greenhouse.io/chanzuckerberginitiative/jobs/2215049"
            analyticsEventName="Landing_hiring-link_clicked"
          >
            Hiring
          </ExternalLink>
          <ExternalLink
            className={cs.headerLink}
            href="https://github.com/chanzuckerberg/idseq-workflows"
            analyticsEventName="Landing_github-link_clicked"
          >
            GitHub
          </ExternalLink>
        </div>
        {browserInfo.supported ? (
          <div className="sign-in">
            <TransparentButton
              text="Sign In"
              onClick={signInLink}
              disabled={!browserInfo.supported}
            />
          </div>
        ) : (
          <div className="alert-browser-support">
            {browserInfo.browser} is not currently supported. Please sign in
            from a different browser.
          </div>
        )}
      </div>
    </div>
  );
};

LandingHeader.propTypes = {
  browserInfo: PropTypes.object,
};

export default LandingHeader;
