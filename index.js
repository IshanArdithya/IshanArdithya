async function setWeatherInformation() {
    await fetch(
      `http://api.weatherstack.com/current?access_key=${process.env.WEATHERSTACK_KEY}&query=Colombo`
    )
      .then(r => r.json())
      .then(r => {
        if (r.current) {
          DATA.city_temperature = Math.round(r.current.temperature);
          DATA.city_weather = r.current.weather_descriptions[0];
          DATA.city_weather_icon = r.current.weather_icons[0];
        } else {
          console.error('Error fetching weather data:', r.error);
        }
      })
      .catch(error => console.error('Failed to fetch weather information:', error));
  }
  