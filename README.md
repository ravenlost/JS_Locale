# CorbeauPerdu.i18n.Locale Class
Locale class wrapper to get translations data from a JSON array object<br/><br/>
**@requires sprintf() function:**
<pre>
  https://github.com/alexei/sprintf.js,
  https://github.com/kvz/locutus/blob/master/src/php/strings/sprintf.js
</pre>

**Usage:**
<pre>
<script src="sprintf.js"></script>
<script src="Locale.js"></script>

<script>
var lang = "fr_FR";
var defaultDomainName = "main";
var defaultDomainData = {"":{"domain":"main","language":"fr_FR","nplurals":"1","plural":"(n > 1)"},"User Listing":"Gestion des usagers","Search":"Recherche","Home":"Accueil","Modify":"Modifier"};
var useCustomPluralForms = true;
var debug = true;

init locale with default domain data
locale = new CorbeauPerdu.i18n.Locale(lang, defaultDomainName, defaultDomainData, useCustomPluralForms, debug);

load additional domain:
locale.loadDomain("navbar", {"":{"domain":"navbar","language":"fr_FR","nplurals":"1","plural":"(n > 1)"},"Home":"Accueil","User management":"Gestion des usagers","Logout":"Déconnexion"});

make all returned messages formatted for web (htmlentitite's like the messages) and replace linebreaks '\n' with '&lt;br/>'
locale.setFormatMessages4Web(true); // default is false

if setFormatMessages4Web is TRUE, then also format placeholder values for web?
locale.setFormatMessages4WebInclPlaceholders(true); // default is true

get translations:
locale.gettext("User Listing");                                         // can also use locale._(...)
locale.ngettext("You have one contract", "You have %d contracts", 6);   // can also use locale._n(...)
locale.dgettext("navbar","Logout");                                     // can also use locale._d(...)
locale.dngettext("navbar","You have one mail", "You have %d mails", 6); // can also use locale._dn(...)

get loaded domains data:
console.log(locale.getLoadedDomains());

get running language:
console.log(locale.getLang())
</script>
</pre>

**Notes about sprintf functionnality:**<br/>
You can provide any of the *gettext() functions 1 or many 'v' optional argument(s). <br/>
These values will be used to replace the sprintf's placeholders! i.e.:<br/>
`locale._n("Welcome, %s! You have %d mail.", "Welcome, %s! You have %d emails.", "John", 5);`

**Notes about the JSON data:**<br/>
If you are using gettext's mo/po files on your site for translations, you can always try/modify po2json,
to convert .PO files to JSON data and pass that to the constructor/loadDomain():<br/>
<pre>
  https://github.com/guillaumepotier/gettext.js/blob/master/bin/po2json
  https://github.com/mikeedwards/po2json

  and also look at: https://toolkit.translatehouse.org/
</pre><br/>

**JSON Data HAS to have the following headers: "domain" and "language" are optional!**<br/>
<pre>
{
  "": {
    "domain": "prestadesk",
    "language": "fr_FR",
    "nplurals": "1",
    "plural": "(n > 1)"
  },

  "simple key": "It's translation"
}
</pre>

The 'nplurals' value has to be the number of possible plural forms, EXCLUDING the singular form!<br/>
Gettext puts the singular form in the same array has the plural forms, thus in the above case, nplurals (for gettext!) would be equal to 2!<br/>

I have written this class (and the PHP Locale class) as to have:<br/>
<pre>
   "some singular message": "some singular translation",
   "some plural message": [
     "some plural translation message v1",
     "some plural translation message v2",
     "some plural translation message v3"
   ]
</pre>

where v1, v2, or v3 is applied based on what is returned from the 'plural' test!

If for some reason you don't provide the nplurals/plural value in the JSON data, you can set useCustomPluralForms to FALSE in the constructor,
and the script will use the simple DEFAULTPLURAL test which is set (a simple true/false test) to determine whether to use plural value or not.
