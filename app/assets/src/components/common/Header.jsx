import React from "react";
import PropTypes from "prop-types";
import moment from "moment";
import { forbidExtraProps } from "airbnb-prop-types";
import cx from "classnames";

import BasicPopup from "~/components/BasicPopup";
import { UserContext } from "~/components/common/UserContext";
import { showToast } from "~/components/utils/toast";
import Notification from "~ui/notifications/Notification";
import ToastContainer from "~ui/containers/ToastContainer";
import BareDropdown from "~ui/controls/dropdowns/BareDropdown";
import AlertIcon from "~ui/icons/AlertIcon";
import LogoIcon from "~ui/icons/LogoIcon";
import RemoveIcon from "~ui/icons/RemoveIcon";
import {
  DISCOVERY_DOMAIN_MY_DATA,
  DISCOVERY_DOMAIN_ALL_DATA,
  DISCOVERY_DOMAIN_PUBLIC,
} from "~/components/views/discovery/discovery_api";
import { postToUrlWithCSRF } from "~utils/links";
import { logAnalyticsEvent, withAnalytics } from "~/api/analytics";
import ExternalLink from "~/components/ui/controls/ExternalLink";

import cs from "./header.scss";

// TODO(mark): Remove after this expires.
const PRIVACY_UPDATE_DATE = moment("2019-06-24", "YYYY-MM-DD");

const setPrivacyUpdateNotificationViewed = () => {
  localStorage.setItem("dismissedPrivacyUpdateNotification", "true");
};

const showPrivacyUpdateNotification = () => {
  const daysLeft = Math.ceil(
    moment.duration(PRIVACY_UPDATE_DATE.diff(moment())).asDays()
  );

  if (daysLeft > 0) {
    showToast(({ closeToast }) => (
      <Notification
        type="warn"
        onClose={() => {
          setPrivacyUpdateNotificationViewed();
          closeToast();
        }}
      >
        Our Terms of Use and Privacy Policy will be updating in {daysLeft}{" "}
        {daysLeft === 1 ? "day" : "days"}.{" "}
        <a
          href="/terms_changes"
          onClick={setPrivacyUpdateNotificationViewed}
          className={cs.notificationLink}
        >
          Read a summary of the changes here.
        </a>
      </Notification>
    ));
  }
};

class Header extends React.Component {
  componentDidMount() {
    const { userSignedIn } = this.props;
    if (userSignedIn) {
      this.displayPrivacyUpdateNotification();
    }
  }

  displayPrivacyUpdateNotification = () => {
    const dismissedPrivacyUpdateNotification = localStorage.getItem(
      "dismissedPrivacyUpdateNotification"
    );

    if (dismissedPrivacyUpdateNotification !== "true") {
      showPrivacyUpdateNotification();
    }
  };

  render() {
    const {
      adminUser,
      userSignedIn,
      showBlank,
      disableNavigation,
      ...userMenuProps
    } = this.props;

    const { allowedFeatures } = this.context || {};

    if (showBlank) {
      return (
        <div className={cs.header}>
          <div className={cs.logo}>
            <LogoIcon className={cs.icon} />
          </div>
        </div>
      );
    }

    return (
      userSignedIn && (
        <div>
          <AnnouncementBanner />
          <div className={cs.header}>
            <div className={cs.logo}>
              <a href="/">
                <LogoIcon className={cs.icon} />
              </a>
            </div>
            <div className={cs.fill} />
            {!disableNavigation && <MainMenu adminUser={adminUser} />}
            {!disableNavigation && (
              <UserMenuDropDown
                adminUser={adminUser}
                allowedFeatures={allowedFeatures}
                {...userMenuProps}
              />
            )}
          </div>
          {
            // Initialize the toast container - can be done anywhere (has absolute positioning)
          }
          <ToastContainer />
          <iframe
            className={cs.backgroundRefreshFrame}
            src="/auth0/background_refresh"
          />
        </div>
      )
    );
  }
}

Header.propTypes = {
  adminUser: PropTypes.bool,
  userSignedIn: PropTypes.bool,
  disableNavigation: PropTypes.bool,
  showBlank: PropTypes.bool,
};

Header.contextType = UserContext;

const AnnouncementBanner = () => {
  return (
    <div className={cs.announcementBanner}>
      <BasicPopup
        content={
          "Low-Support Mode: We will only be responding to highly urgent issues from 12/21–12/29. For now, check out our Help Center. Happy Holidays!"
        }
        position="bottom center"
        wide="very"
        trigger={
          <span className={cs.content}>
            <AlertIcon className={cs.icon} />
            <span className={cs.title}>Low-Support Mode:</span>
            We will only be responding to highly urgent issues from 12/21–12/29.
            For now, check out our
            <ExternalLink
              className={cs.link}
              href="https://help.idseq.net"
              onClick={() =>
                logAnalyticsEvent("AnnouncementBanner_link_clicked")
              }
            >
              Help Center
            </ExternalLink>. Happy Holidays!
          </span>
        }
      />
      <RemoveIcon
        className={cs.close}
        onClick={() => {
          logAnalyticsEvent("AnnouncementBanner_close_clicked");
          console.log("clicked");
        }}
      />
    </div>
  );
};

const UserMenuDropDown = ({
  adminUser,
  email,
  signInEndpoint,
  signOutEndpoint,
  userName,
  allowedFeatures,
}) => {
  const signOut = () => postToUrlWithCSRF(signOutEndpoint);

  const renderItems = adminUser => {
    let userDropdownItems = [];

    allowedFeatures.includes("bulk_downloads") &&
      userDropdownItems.push(
        <BareDropdown.Item
          key="1"
          text={
            <a
              className={cs.option}
              href="/bulk_downloads"
              onClick={() =>
                logAnalyticsEvent("Header_dropdown-downloads-option_clicked")
              }
            >
              Downloads
            </a>
          }
        />
      );

    userDropdownItems.push(
      <BareDropdown.Item
        key="2"
        text={
          <ExternalLink
            className={cs.option}
            href="https://help.idseq.net"
            onClick={() =>
              logAnalyticsEvent("Header_dropdown-help-option_clicked")
            }
          >
            Help Center
          </ExternalLink>
        }
      />,
      <BareDropdown.Item
        key="3"
        text={
          <a
            className={cs.option}
            href={`mailto:${email}?Subject=Report%20Feedback`}
            onClick={() =>
              logAnalyticsEvent("Header_dropdown-feedback-option_clicked")
            }
          >
            Contact Us
          </a>
        }
      />
    );

    adminUser &&
      userDropdownItems.push(
        <BareDropdown.Item
          key="4"
          text={
            <a className={cs.option} href="/users/new">
              Create User
            </a>
          }
        />
      );

    userDropdownItems.push(
      <BareDropdown.Divider key="5" />,
      <BareDropdown.Item
        key="6"
        text={
          <a
            className={cs.option}
            target="_blank"
            rel="noopener noreferrer"
            href="https://idseq.net/terms"
            onClick={() =>
              logAnalyticsEvent("Header_dropdown-terms-option_clicked")
            }
          >
            Terms of Use
          </a>
        }
      />,
      <BareDropdown.Item
        key="7"
        text={
          <a
            className={cs.option}
            target="_blank"
            rel="noopener noreferrer"
            href="https://idseq.net/privacy"
            onClick={() =>
              logAnalyticsEvent("Header_dropdown-privacy-policy-option_clicked")
            }
          >
            Privacy Policy
          </a>
        }
      />,
      <BareDropdown.Divider key="8" />,
      <BareDropdown.Item
        key="9"
        text="Logout"
        onClick={withAnalytics(
          signOut,
          "Header_dropdown-logout-option_clicked"
        )}
      />
    );
    return userDropdownItems;
  };

  return (
    <div>
      <BareDropdown
        trigger={<div className={cs.userName}>{userName}</div>}
        className={cs.userDropdown}
        items={renderItems(adminUser)}
        direction="left"
      />
    </div>
  );
};

UserMenuDropDown.propTypes = forbidExtraProps({
  adminUser: PropTypes.bool,
  email: PropTypes.string.isRequired,
  signInEndpoint: PropTypes.string.isRequired,
  signOutEndpoint: PropTypes.string.isRequired,
  userName: PropTypes.string.isRequired,
  allowedFeatures: PropTypes.arrayOf(PropTypes.string),
});

const MainMenu = ({ adminUser }) => {
  const isSelected = tab => window.location.pathname.startsWith(`/${tab}`);

  return (
    <div className={cs.mainMenu}>
      <a
        className={cx(
          cs.item,
          isSelected(DISCOVERY_DOMAIN_MY_DATA) && cs.selected
        )}
        href={`/${DISCOVERY_DOMAIN_MY_DATA}`}
      >
        My Data
      </a>
      <a
        className={cx(
          cs.item,
          isSelected(DISCOVERY_DOMAIN_PUBLIC) && cs.selected
        )}
        href={`/${DISCOVERY_DOMAIN_PUBLIC}`}
      >
        Public
      </a>
      {adminUser && (
        <a
          className={cx(
            cs.item,
            isSelected(DISCOVERY_DOMAIN_ALL_DATA) && cs.selected
          )}
          href={`/${DISCOVERY_DOMAIN_ALL_DATA}`}
        >
          All Data
        </a>
      )}
      <a
        className={cx(cs.item, isSelected("samples/upload") && cs.selected)}
        href={"/samples/upload"}
        onClick={() => logAnalyticsEvent("Header_upload-link_clicked")}
      >
        Upload
      </a>
    </div>
  );
};

MainMenu.propTypes = {
  adminUser: PropTypes.bool,
};

export default Header;
