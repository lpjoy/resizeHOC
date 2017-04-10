/* global window, define */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['react'], factory);
  } else {
    // Browser globals
    root.resizeHOC = factory(root.React);
  }
}(this, function(React) {
  // inline https://www.npmjs.com/package/except
  function except(object) {
    const ap = Array.prototype;
    const result = {};
    const keys = ap.concat.apply(ap, ap.slice.call(arguments, 1));

    for (const key in object) {
      if (keys.indexOf(key) === -1) {
        result[key] = object[key];
      }
    }

    return result;
  }

  const availableDirections = [
    'top', 'right', 'bottom', 'left', 'topRight', 'bottomRight', 'bottomLeft', 'topLeft',
  ];

  const styles = {
    base: {
      position: 'absolute',
    },
    top: {
      width: '100%',
      height: '10px',
      top: '-5px',
      left: '0px',
      cursor: 'row-resize',
    },
    right: {
      width: '10px',
      height: '100%',
      top: '0px',
      right: '-5px',
      cursor: 'col-resize',
    },
    bottom: {
      width: '100%',
      height: '10px',
      bottom: '-5px',
      left: '0px',
      cursor: 'row-resize',
    },
    left: {
      width: '10px',
      height: '100%',
      top: '0px',
      left: '-5px',
      cursor: 'col-resize',
    },
    topRight: {
      width: '20px',
      height: '20px',
      position: 'absolute',
      right: '-10px',
      top: '-10px',
      cursor: 'ne-resize',
    },
    bottomRight: {
      width: '20px',
      height: '20px',
      position: 'absolute',
      right: '-10px',
      bottom: '-10px',
      cursor: 'se-resize',
    },
    bottomLeft: {
      width: '20px',
      height: '20px',
      position: 'absolute',
      left: '-10px',
      bottom: '-10px',
      cursor: 'sw-resize',
    },
    topLeft: {
      width: '20px',
      height: '20px',
      position: 'absolute',
      left: '-10px',
      top: '-10px',
      cursor: 'nw-resize',
    },
  };

  function getWrapperStyle({ top, left, width, height }) {
    return {
      top,
      left,
      width,
      height,
      position: 'relative',
    };
  }

  function getHandleStyle(dir) {
    return Object.assign({}, styles.base, styles[dir]);
  }

  const resizeHOC = (opts = {}) => (WrappedComponent) => {
    const { directions = availableDirections } = opts;

    class ResizeParent extends React.PureComponent {
      constructor(props, context) {
        super(props, context);
        const { left, top, width, height } = props;

        this.resizeStart = this.resizeStart.bind(this);
        this.resize = this.resize.bind(this);
        this.resizeStop = this.resizeStop.bind(this);
        this.resizeStartInDirection = {};
        availableDirections.forEach((direction) => {
          this.resizeStartInDirection[direction] = this.resizeStart.bind(this, direction);
        });

        this.isResizing = false;
        this.initialLeft = left;
        this.initialTop = top;
        this.initialWidth = width;
        this.initialHeight = height;
        this.state = { left, top, width, height };
      }

      componentWillReceiveProps(nextProps) {
        const { left, top, width, height } = nextProps;
        this.initialLeft = left;
        this.initialTop = top;
        this.initialWidth = width;
        this.initialHeight = height;
      }

      resizeStart(direction, event) {
        console.log('[DEBUG] resizing start');
        event.stopPropagation();
        event.preventDefault();
        window.addEventListener('mouseup', this.resizeStop);
        window.addEventListener('mousemove', this.resize);
        this.isResizing = true;
        this.direction = direction;
        this.originalX = event.clientX;
        this.originalY = event.clientY;
      }

      resize(event) {
        if (!this.isResizing) return;

        event.stopPropagation();
        event.preventDefault();
        const distanceX = event.clientX - this.originalX;
        const distanceY = event.clientY - this.originalY;

        const direction = this.direction;
        let { left, top, width, height } = this.state;

        if (~['left', 'bottomLeft', 'topLeft'].indexOf(direction)) {
          width = Math.max(0, this.initialWidth - distanceX);
          left = width > 0 ? this.initialLeft + distanceX : this.initialWidth + this.initialLeft;
        }
        if (~['right', 'bottomRight', 'topRight'].indexOf(direction)) {
          width = Math.max(0, this.initialWidth + distanceX);
        }
        if (~['top', 'topLeft', 'topRight'].indexOf(direction)) {
          height = Math.max(0, this.initialHeight - distanceY);
          top = height > 0 ? this.initialTop + distanceY : this.initialHeight + this.initialTop;
        }
        if (~['bottom', 'bottomLeft', 'bottomRight'].indexOf(direction)) {
          height = Math.max(0, this.initialHeight + distanceY);
        }

        this.setState({ top, left, width, height });
      }

      resizeStop(event) {
        if (!this.isResizing) return;
        console.log('[DEBUG] resizing end');
        event.stopPropagation();
        event.preventDefault();
        window.removeEventListener('mouseup', this.resizeStop);
        window.removeEventListener('mousemove', this.resize);
        const { top, left, width, height } = this.state;
        this.isResizing = false;
        this.initialLeft = left;
        this.initialTop = top;
        this.initialWidth = width;
        this.initialHeight = height;
        this.props.onResizeStop({ top, left, width, height });
      }

      render() {
        const { top, left, width, height } = this.state;
        const omit = Object.keys(ResizeParent.propTypes);
        const passThroughProps = except(this.props, omit)
        const componentProps = Object.assign({}, passThroughProps, { width, height });

        return React.createElement(
          'div',
          { style: getWrapperStyle({ top, left, width, height }) },
          React.createElement(WrappedComponent, componentProps),
          /* render resizer handles */
          directions.map((direction) =>
            React.createElement(
              'div',
              {
                style: getHandleStyle(direction),
                onMouseDown: this.resizeStartInDirection[direction]
              }
            )
          )
        );
      }
    }

    const PropTypes = React.PropTypes;
    ResizeParent.propTypes = {
      left: PropTypes.number,
      top: PropTypes.number,
      width: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired,
      onResize: PropTypes.func,
      onResizeStart: PropTypes.func,
      onResizeStop: PropTypes.func,
    };

    ResizeParent.defaultProps = {
      left: 0,
      top: 0,
      onResize: () => null,
      onResizeStart: () => null,
      onResizeStop: () => null,
    };

    return ResizeParent;
  };

  return resizeHOC;
}));
