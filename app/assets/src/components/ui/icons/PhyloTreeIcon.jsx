import React from "react";
import PropTypes from "prop-types";
import { forbidExtraProps } from "airbnb-prop-types";

const PhyloTreeIcon = props => {
  return (
    <svg
      {...props}
      viewBox="0 0 26 26"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      fill="#3867FA"
      fillRule="nonzero"
    >
      <g>
        <g transform="translate(-1245.000000, -164.000000)">
          <g transform="translate(1258.000000, 177.000000) rotate(-90.000000) translate(-1258.000000, -177.000000) translate(1245.000000, 164.000000)">
            <path
              d="M12.9487786,3.70480204e-13 C10.833464,3.70480204e-13 9.09692685,1.73904706 9.09692685,3.85806767 C9.09692685,5.68673113 10.4156671,7.16360947 12.1292354,7.55172997 L12.1292354,12.2099907 L3.83136289,12.2099907 C3.38503871,12.2171891 3.02816999,12.5838084 3.03230886,13.0308769 L3.03230886,18.4688003 C1.31874031,18.8569208 0,20.3337992 0,22.1624626 C0,24.2813203 1.73653746,26 3.85185168,26 C5.96716541,26 7.68321511,24.2813203 7.68321511,22.1624626 C7.68321511,20.3266299 6.37421719,18.8495886 4.65090587,18.4688003 L4.65090587,13.8517632 L12.1292354,13.8517632 L12.1292354,18.4688003 C10.4156671,18.8569208 9.09692685,20.3337992 9.09692685,22.1624626 C9.09692685,24.2813203 10.833464,26 12.9487786,26 C15.0640935,26 16.8006305,24.2813203 16.8006305,22.1624626 C16.8006305,20.3266299 15.4711446,18.8495886 13.7478328,18.4688003 L13.7478328,13.8517632 L21.2466502,13.8517632 L21.2466502,18.4893306 C19.5740609,18.907269 18.2962969,20.3631282 18.2962969,22.1624626 C18.2962969,24.2813203 20.0328331,26 22.1481476,26 C24.2634638,26 26,24.2813203 26,22.1624626 C26,20.2976267 24.6295204,18.7969593 22.8652486,18.44827 L22.8652486,13.0308769 C22.8672505,12.8125641 22.7815506,12.6026086 22.6274217,12.4482271 C22.4732928,12.2938457 22.2636737,12.2079981 22.0457053,12.2099907 L13.7478328,12.2099907 L13.7478328,7.55172997 C15.4711446,7.17077879 16.8006305,5.69373751 16.8006305,3.85806767 C16.8006305,1.73888412 15.0640935,0 12.9487786,0 Z M12.9487786,1.64160959 C14.186401,1.64160959 15.1615445,2.61810251 15.1615445,3.85806767 C15.1615445,5.09738107 14.186401,6.09456724 12.9487786,6.09456724 C11.7111581,6.09456724 10.715524,5.09738107 10.715524,3.85806767 C10.715524,2.61810251 11.7111581,1.64160959 12.9487786,1.64160959 Z M3.85185168,19.9258001 C5.08947234,19.9258001 6.06461762,20.9226604 6.06461762,22.1624626 C6.06461762,23.4022649 5.08947234,24.3790837 3.85185168,24.3790837 C2.61422971,24.3790837 1.61859712,23.4022649 1.61859712,22.1624626 C1.61859712,20.9228234 2.61422971,19.9258001 3.85185168,19.9258001 Z M12.9487786,19.9258001 C14.186401,19.9258001 15.1615445,20.9226604 15.1615445,22.1624626 C15.1615445,23.4022649 14.186401,24.3790837 12.9487786,24.3790837 C11.7111581,24.3790837 10.715524,23.4022649 10.715524,22.1624626 C10.715524,20.9228234 11.7111581,19.9258001 12.9487786,19.9258001 Z M22.1481476,19.9258001 C23.3857683,19.9258001 24.3814032,20.9226604 24.3814032,22.1624626 C24.3814032,23.4022649 23.3857683,24.3790837 22.1481476,24.3790837 C20.910527,24.3790837 19.9353818,23.4022649 19.9353818,22.1624626 C19.9353818,20.9228234 20.910527,19.9258001 22.1481476,19.9258001 Z"
              id="Shape"
            />
          </g>
        </g>
      </g>
    </svg>
  );
};

PhyloTreeIcon.propTypes = forbidExtraProps({
  className: PropTypes.string,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  onBlur: PropTypes.func,
  onClick: PropTypes.func,
  onFocus: PropTypes.func,
});

export default PhyloTreeIcon;
