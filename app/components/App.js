import 'typeface-carter-one'; // eslint-disable-line
import 'typeface-montserrat'; // eslint-disable-line

import React, { Component } from 'react';
import { MuiThemeProvider } from '@material-ui/core/styles';

import theme from './theme';
import Header from './Header';
import Library from './Library';
import Loading from './Loading';
import PageViewer from './PageViewer';

import encodepath from '../modules/encodepath';
import File from '../modules/File';
import { generateCenterfolds } from '../modules/generate';
import { strainOnlyComics } from '../modules/strain';
import turnPage from '../modules/turnPage';

const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');

export default class App extends Component {
  state = {
    openedComic: {
      name: null,
      basename: '',
      tempdir: '',
      extname: '',
      origin: '',

      pending: 0,
      error: false,
      errorMessage: '',
      stat: ''
    },
    pages: [],

    // Page Data for Main => PageViewer => Page
    centerfolds: [],
    currentPageIndex: '',
    pageCount: 2,

    // Errors
    error: false,
    errorMessage: '',

    // Button Data to pass to Main => Header => ButtonBar
    buttons: {
      changePageCount: {
        name: 'changePageCount',
        disabled: false,
        func: () => {
          this.changePageCount();
        }
      },
      nextComic: {
        name: 'nextComic',
        disabled: false,
        func: () => {
          this.openNextComic();
        }
      },
      openLibrary: {
        name: 'openLibrary',
        disabled: false,
        func: () => {
          this.openLibrary();
        }
      },
      pageLeft: {
        name: 'pageLeft',
        disabled: false,
        func: () => {
          this.turnPageLeft();
        }
      },
      pageRight: {
        name: 'pageRight',
        disabled: false,
        func: () => {
          this.turnPageRight();
        }
      },
      prevComic: {
        name: 'prevComic',
        disabled: false,
        func: () => {
          this.openPrevComic();
        }
      },
      options: {
        name: 'options',
        disabled: false,
        func: () => {
          this.toggleOptions();
        }
      },
      trash: {
        name: 'trash',
        disabled: false,
        func: () => {
          this.clearCache();
        }
      }
    },

    // Material UI Drawer data
    top: false,
    options: false,

    // Contents data for Library
    content: {},

    // Zoom data for PageViewer
    zoomLevel: 100,

    // bool to display loading screen
    isLoading: false,

    // Image cache
    images: []
  };

  componentDidMount() {
    window.addEventListener('keydown', e => {
      if (
        !(
          this.state.openedComic.name === null ||
          document.activeElement.tagName === 'input'
        )
      ) {
        if (e.code === 'ArrowRight') {
          this.turnPageRight();
        } else if (e.code === 'ArrowLeft') {
          this.turnPageLeft();
        }
      }
    });
  }

  // componentDidUpdate() {
  //   if
  // }

  changePageCount = () => {
    const newPageCount = this.state.pageCount === 2 ? 1 : 2;
    console.log('changePageCount: ', newPageCount);
    this.setState({ pageCount: newPageCount }, () => {
      if (this.state.pageCount === 2) {
        if (
          this.state.centerfolds.indexOf(this.state.currentPageIndex) > -1 ||
          this.state.centerfolds.indexOf(this.state.currentPageIndex + 1) > -1
        ) {
          this.setCurrentPages(this.state.currentPageIndex, 1);
          return;
        }
      }
      this.setCurrentPages(this.state.currentPageIndex, this.state.pageCount);
    });
  };

  clearCache = () => {
    console.log('clearing cache');
  };

  closeLibrary = () => {
    this.toggleDrawer('top', false);
  };

  // generateAdjacentComics = () => {
  //   const newButtons = copyDeepObject(this.state.buttons);
  //   console.log(newButtons);
  //   const nextComic = new ButtonFunction();
  //   const prevComic = new ButtonFunction();
  //   generateNextComics(this.state.openedComic, (nextOrigin, prevOrigin) => {
  //     if (nextOrigin) {
  //       nextComic.set(() => {
  //         this.openComic(nextOrigin);
  //       }, nextOrigin);
  //     }
  //     if (prevOrigin) {
  //       prevComic.set(() => {
  //         this.openComic(prevOrigin);
  //       }, prevOrigin);
  //     }
  //     console.log(nextComic, prevComic);
  //     newButtons.nextComic = nextComic;
  //     newButtons.prevComic = prevComic;
  //     console.log(newButtons);
  //     this.setState({ buttons: newButtons });
  //   });
  // };

  generateKeys = (pages, cb) => {
    const pageKeys = Array(...{ length: pages.length }).map(
      Function.call,
      Number
    );
    this.setState({ pageKeys }, cb);
  };

  generatePages = (tempdir, cb) => {
    console.log('generatePages');
    fs.readdir(tempdir, (err, files) => {
      console.log(files);
      const pages = files.map((file, i) => {
        const fullpath = path.join(tempdir, file);
        return {
          pagePath: fullpath,
          encodedPagePath: encodepath(fullpath),
          key: i
        };
      });
      console.log('pages Generated');
      cb(pages);
    });
  };

  handleKeyPress = e => {
    console.log(e);
  };

  isCenterfold = index => this.state.centerfolds.includes(index);

  loadImages = () => {
    const loadedImages = this.state.pages.map(page => {
      const img = new Image();
      const imgSrc = page.encodedPagePath;
      img.src = imgSrc;
      return img;
    });
    this.setState({ images: loadedImages });
  };

  openComic = fullpath => {
    const Comic = new File(fullpath);
    this.setState({ isLoading: true }, () => {
      Comic.extract(comic => {
        if (comic.error) {
          this.throwError(true, comic.errorMessage);
        }
        this.generatePages(comic.tempdir, pages => {
          const pagePaths = pages.map(page => page.pagePath);
          console.log(pagePaths);
          const centerfolds = generateCenterfolds(pagePaths);
          this.setState(
            {
              centerfolds,
              openedComic: comic,
              isLoading: false,
              pages,
              top: false
            },
            () => {
              this.loadImages();
              // this.generateAdjacentComics();
              const pagesToDisplay = this.state.centerfolds.includes(0) ? 1 : 2;
              this.setCurrentPages(0, pagesToDisplay);
            }
          );
        });
      });
    });
  };

  openAdjacentComic = polarity => {
    if (this.state.openedComic.name === null) {
      return;
    }
    const originDirname = path.dirname(this.origin);
    fs.readdir(originDirname, (err, files) => {
      const strainedComics = strainOnlyComics(files);
      const index = strainedComics.indexOf(this.state.openedComic.name);
      const newIndex = index + polarity;
      if (newIndex > -1 && newIndex < strainedComics.length) {
        const newComicName = strainedComics[newIndex];
        const newComicFilepath = path.join(originDirname, newComicName);
        this.openComic(newComicFilepath);
      }
    });
  };

  openLibrary = () => {
    this.toggleDrawer('top', true);
  };

  openNextComic = () => {
    const polarity = 1;
    this.openAdjacentComic(polarity);
  };

  openPrevComic = () => {
    const polarity = -1;
    this.openAdjacentComic(polarity);
  };

  // renderButtons = () => {
  //   const newButtons = copyDeepObject(this.state.buttons);
  //   console.log('rendering buttons');
  //   newButtons.pageLeft.disabled = true;
  //   newButtons.pageRight.disabled = true;
  //   if (this.shouldPageTurnLeft()) {
  //     console.log('Left');
  //     newButtons.pageLeft.disabled = false;
  //   }
  //   if (this.shouldPageTurnRight()) {
  //     console.log('Right');
  //     newButtons.pageRight.disabled = false;
  //   }
  //   this.setState({ buttons: newButtons },() => {
  //     console.log('Buttons rendered:', newButtons);
  //   });
  // };

  saveContentDataToMain = content => {
    this.setState({ content });
  };

  setCurrentPages = (newPageIndex, pagesToDisplay) => {
    const S = this.state;
    const newCurrentPages = [];
    const newEncodedPages = [];
    const pagesToRender = Math.min(S.pageCount, pagesToDisplay);
    console.log(pagesToRender);
    console.log('setCurrentPages: ', S.openedComic);
    for (let i = 0; i < pagesToRender; i += 1) {
      const totalIndex = newPageIndex + i;
      if (totalIndex < S.openedComic.pages.length) {
        const comicPagePath = path.join(
          S.openedComic.tempdir,
          S.openedComic.pages[totalIndex]
        );
        const { width } = sizeOf(comicPagePath);
        newCurrentPages[i] = comicPagePath;

        newEncodedPages[i] = {
          page: encodepath(comicPagePath),
          key: totalIndex,
          width
        };
      }
    }
    console.log(newCurrentPages);
    this.setState({
      currentPageIndex: newPageIndex,
      currentPages: newCurrentPages,
      encodedPages: newEncodedPages
    });
  };

  setZoomLevel = value => {
    this.setState({ zoomLevel: value });
  };

  shouldPageTurn = (a, b) =>
    !(
      this.state.currentPageIndex === a ||
      (this.state.currentPageIndex === b &&
        this.pageCount === 2 &&
        (this.isCenterfold(a) || this.isCenterfold(b)))
    );

  shouldPageTurnLeft = () => this.state.currentPageIndex !== 0;

  shouldPageTurnRight = () =>
    this.shouldPageTurn(
      this.state.pages.length - 1,
      this.state.pages.length - 2
    );

  toggleDrawer = (side, open) => {
    this.setState({
      [side]: open
    });
  };

  toggleOptions = () => {
    this.toggleDrawer('options', !this.options);
  };

  throwError = (error, errorMessage) => {
    if (error) {
      this.setState({ error, errorMessage }, () => {
        console.log(this.state.errorMessage);
        // TODO Spawn error module;
      });
    }
  };

  turnPage = polarity => {
    if (this.state.openedComic.name) {
      turnPage(
        this.state.currentPageIndex,
        this.state.centerfolds,
        this.state.pageCount,
        this.state.pages.length,
        polarity,
        (newPageIndex, pagesToDisplay) => {
          this.setCurrentPages(newPageIndex, pagesToDisplay);
        }
      );
    }
  };

  turnPageLeft = () => {
    const polarity = -1;
    if (this.shouldPageTurnLeft()) {
      this.turnPage(polarity);
    }
  };

  turnPageRight = () => {
    const polarity = 1;
    if (this.shouldPageTurnRight()) {
      this.turnPage(polarity);
    }
  };

  render() {
    console.log('Main (state):', this.state);
    return (
      <MuiThemeProvider theme={theme}>
        <div className="main">
          <Header
            buttons={this.state.buttons}
            changePageCount={this.changePageCount}
            pageCount={this.state.pageCount}
            setZoomLevel={this.setZoomLevel}
            zoomLevel={this.state.zoomLevel}
          />
          <Library
            closeDrawer={this.closeLibrary}
            loadedLibrary={this.state.content.fullpath}
            openComic={this.openComic}
            throwError={this.throwError}
            open={this.state.top}
            saveContentDataToMain={this.saveContentDataToMain}
          />
          <PageViewer
            comic={this.state.openedComic}
            pages={this.state.encodedPages}
            openComic={this.openComic}
            turnPage={this.turnPage}
            zoomLevel={this.state.zoomLevel}
          />
          <Loading isLoading={this.state.isLoading} />
        </div>
      </MuiThemeProvider>
    );
  }
}
