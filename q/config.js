/* Public settings for the questionnaire pages. The Google Form is the answer bucket: every save posts one row into it
   (a Google Form accepts posts from anywhere; the responses land in a Google Sheet Nicholas and Claude read any time).
   Optional Supabase (url/key) is a second bucket; if both are set, both get the row. */
window.Q_CONFIG = {
  gform: "https://docs.google.com/forms/d/e/1FAIpQLSfGBwqZ6QghyqNqdHX5x8oJexsl3DBxC9pDZxsNJ0evN18bmw/formResponse",
  gentry: "entry.52824252",
  url: "", key: "", sms: ""
};
