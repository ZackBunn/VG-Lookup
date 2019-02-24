'use strict';

const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
const apiKey = 'f3ba5991e5ea616eb210db0b970ff98a';
const searchURL = 'https://api-v3.igdb.com';


// display main <ul> where each <li> represents a game
function displayResults(games) {
  $('#results-list').empty(); // empty previuos results
  let listItemsHtml = getListItems(games); // get html for all games
  $('#results-list').html(listItemsHtml); // inject <li> for all games
  $('#landing').empty(); //removes info text
  displayPlatforms(games); // lookup platforms and inject html into a container referenced by class name
  $('#results').removeClass('hidden'); // show results
};

// display the html for platforms for all games
function displayPlatforms(games) {
  const $games = $('#results-list li'); // find the list of <li> elements representing each game

  $games.toArray().forEach(g => { // loop through the jquery object array of <li> elements

    const $game = $(g); // to Array turns the jquery objects back to html elements so you need to convert them back to a jquery object
    const gameId = $game.attr('data-game-id'); // find the ID of the game represented by the ID

    const game = games.find(g => g.id === +gameId); // find the game in the games collection passed in to this method. note that +gameId converts it to a number for comparison
    if (game.platformIds.length > 0) { // if this game object has platform look them up
      // make a comma delimited string of the platformIds. The api endpoint will only allow for 10 at a time. So for now we'll only take 10.
      const platforms = game.platformIds.slice(-10).join(', ');
      const $platforms = $game.find('.platforms'); // find the platforms container by class name
      fetchGameData('platforms', `fields *; where id = (${platforms});`, (response) => {
        game.platforms = response; // take the response object and add it to the game in the games collection
        $game.find('.platforms').text(game.platforms.map(p => p.name).join(', ')); // add a comma delimited list of platforms. You can also add a link to the platofrms website or in turn lookup the platform image url
      });
    }
  });
}

//render the list
function getListItems(games) {
  let html = '';

  games.forEach(g => {
    html += getGameHtml(g);
  });

  return html;
}

// render an individual game <li> element
function getGameHtml(game) {

 let html = `<li data-game-id="${game.id}">
 <h2>&nbsp;${game.title}</h2></br>`;

  if (game.coverImageId > 0) {
    html += `<div id="coverimg">${getImage(game)}</div></br>`;
  }; 

  if (game.platformIds > 0) {
    html += '<div id="info"><strong>Platforms:</strong>&nbsp;<span class="platforms"></div></span>'
  };

  if (game.releaseDate != false) {
    html += `<div id="info"><strong>Release Date:</strong>&nbsp;<span class="releaseDate">${readableDate(game)}</span></div>`
  };

  if (game.rating > 0) {
      html +=  `<div id="info"><strong>Average Rating:</strong>&nbsp;<span id="content">${roundRating(game)}/100</span></div>`;
  };

  if (game.summary.length > 0) {
      html += `<div id="info"><strong>Summary:</strong>&nbsp;<span id="content">${game.summary}</span></div>`;
  };

  if (game.story.length > 0) {
      html +=  `<div id="info"><strong>Storyline:</strong>&nbsp;<span id="content">${game.story}</span></div></li>`;
  } else if (game.summary.length == 0 && game.story.length == 0) {
    html += '<div id="info"><strong class="noInfo">Sorry there is no info on this game. It is either unreleased or still in development.</strong></div></li>';
  }; 
  return html;
}

//convert image Id into the url
function getImage(game) {

  if (!game.coverImg) return '';

  return `<img src="${game.coverImg.src}"" width="300" alt="${game.title} cover art" style="vertical-align: top;">`;
}

//convert Unix timestamp into mm/dd/yyyy
function readableDate(game) {
  const relDate = new Date( game.releaseDate * 1000)
  return relDate.toLocaleDateString();
}

//round review rating to nearest whole number
function roundRating(game) {
  const roundRate = Math.round(game.rating);
  return roundRate;
}

//Get Parameters from API
function getVideoGames(query) {
  fetchGameData(`games`, `fields id, name, summary, storyline, cover, platforms, first_release_date, total_rating; where name~*"${query}"*;`, (response) => {
    const games = response.map(g => {
      return {
        id: g.id,
        title: g.name,
        summary: g.summary ? g.summary : "",
        story: g.storyline ? g.storyline : "",
        coverImageId: g.cover ? g.cover : 0,
        platformIds: g.platforms ? g.platforms : [],
        releaseDate: g.first_release_date ? g.first_release_date : 0,
        rating: g.total_rating ? g.total_rating : 0
      }
    });
    const coverImageIds = games.map(g => g.coverImageId).join(', ');

    fetchGameData(`covers`, `fields *;where id=(${coverImageIds});`, response => {
      const size = 'cover_big';
      const images = response.map(i => {
        return {
          id: i.id,
          gameId: i.game,
          height: i.height,
          width: i.width,
          src: `https://images.igdb.com/igdb/image/upload/t_${size}/${i.image_id}.jpg` //i.url
        }
      });

      games.forEach(g => g.coverImg = images.find(i => i.gameId === g.id));

      displayResults(games);
    });
  });
}


// sets up the form submit event handler
function watchForm() {
  $('form').submit(event => {
    event.preventDefault();
    $('#results').addClass('hidden');
    const searchTerm = $('#js-search-term').val(); // get search string
    $('#js-error-message').text(''); // clear error messages
    getVideoGames(searchTerm);
  });
}

//fetch the url with the apikey and proxy
function fetchGameData(url, query, callBack) {
  fetch(`${proxyUrl}${searchURL}/${url}`, {
    method: 'POST',
    body: query,
    headers: {
      'Accept': 'application/json',
      'user-key': apiKey,
    },
  }).then(response => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(response.statusText);
  }).then(callBack).catch(err => {
    console.log(err);
    $('#js-error-message').text(`There doesn't seem to be a game with that title, please try again. Error: ${err.message}`);
    $('#landing').empty(); //removes info text
  });
}

$(watchForm);