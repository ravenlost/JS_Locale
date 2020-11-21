/**
 * Locale class wrapper to get translations data from a JSON array object
 * 
 * MIT License
 * 
 * Copyright (c) 2020 Patrick Roy
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @requires sprintf() function:
 *   https://github.com/alexei/sprintf.js,
 *   https://github.com/kvz/locutus/blob/master/src/php/strings/sprintf.js
 *
 * Usage:
 * <pre>
 * <script src="sprintf.js"></script>
 * <script src="Locale.js"></script>
 *
 * <script>
 * var lang = "fr_FR";
 * var defaultDomainName = "main";
 * var defaultDomainData = {"":{"domain":"main","language":"fr_FR","nplurals":"1","plural":"(n > 1)"},"User Listing":"Gestion des usagers","Search":"Recherche","Home":"Accueil","Modify":"Modifier"};
 * var useCustomPluralForms = true;
 * var debug = true;
 *
 * init locale with default domain data
 * locale = new CorbeauPerdu.i18n.Locale(lang, defaultDomainName, defaultDomainData, useCustomPluralForms, debug);
 *
 * load additional domain:
 * locale.loadDomain("navbar", {"":{"domain":"navbar","language":"fr_FR","nplurals":"1","plural":"(n > 1)"},"Home":"Accueil","User management":"Gestion des usagers","Logout":"Déconnexion"});
 *
 * get translations:
 * locale.gettext("User Listing");                                         // can also use locale._(...)
 * locale.ngettext("You have one contract", "You have %d contracts", 6);   // can also use locale._n(...)
 * locale.dgettext("navbar","Logout");                                     // can also use locale._d(...)
 * locale.dngettext("navbar","You have one mail", "You have %d mails", 6); // can also use locale._dn(...)
 *
 * get loaded domains data:
 * console.log(locale.getLoadedDomains());
 *
 * get running language:
 * console.log(locale.getLang())
 * </script>
 * </pre>
 *
 * Notes about sprintf functionnality:
 * You can provide any of the *gettext() functions 1 or many 'v' optional argument(s).
 * These values will be used to replace the sprintf's placeholders! i.e.:
 * locale._n("Welcome, %s! You have %d mail.", "Welcome, %s! You have %d emails.", "John", 5);
 *
 * Notes about the JSON data:
 * If you are using gettext's mo/po files on your site for translations, you can always try/modify po2json,
 * to convert .PO files to JSON data and pass that to the constructor/loadDomain():
 *   https://github.com/guillaumepotier/gettext.js/blob/master/bin/po2json
 *   https://github.com/mikeedwards/po2json
 *
 *   and also look at: https://toolkit.translatehouse.org/
 *
 * JSON Data HAS to have the following headers: "domain" and "language" are optional!
 * {
 *   "": {
 *     "domain": "prestadesk",
 *     "language": "fr_FR",
 *     "nplurals": "1",
 *     "plural": "(n > 1)"
 *   },
 *
 *   "simple key": "It's translation"
 * }
 *
 * 'nplurals' has to be the number of possible plural forms, EXCLUDING the singular form!
 * Gettext puts the singular form in the same array has the plural forms, thus in the above case, nplurals (for gettext!) would be equal to 2!
 *
 * I have written this class (and the PHP Locale class) as to have:
 *
 *    "some singular message": "some singular translation",
 *    "some plural message": [
 *      "some plural translation message v1",
 *      "some plural translation message v2",
 *      "some plural translation message v3"
 *    ]
 *
 * where v1, v2, or v3 is applied based on what is returned from the 'plural' test!
 *
 * If for some reason you don't provide the nplurals/plural value in the JSON data, you can set useCustomPluralForms to FALSE in the constructor,
 * and the script will use the simple DEFAULTPLURAL test which is set (a simple true/false test) to determine whether to use plural value or not.
 *
 * Last Modified:
 * <pre>
 *   2020/04/20 by PRoy - First release
 *   2020/04/25 by PRoy - Added sprintf call in gettext() and dgettext()
 *   2020/04/27 by PRoy - Added ngettext() and dngettext(), with sprintf functionality inside!
 *   2020/04/28 by PRoy - Now using strict, and had to re-locate functions and re-adjust scopes as to what is private and what is public
 *                        Added debug to constructor
 *   2020/05/31 by PRoy - Added setFormatMessages4Web(), setFormatMessages4WebInclPlaceholders() and stringToWeb() to htmlentities'like the returned messages and replace linebreaks '\n' with '<br/>'
 * </pre>
 *
 * @author Patrick Roy (ravenlost2@gmail.com)
 * @version     1.3.0
 */

"use strict";

/**
 * namespace()
 * The 'create namespace' function, since JS has no native way of creating namespaces
 *
 * Usage:
 * namespace('CorbeauPerdu.i18n');
 * namespace('utils','CorbeauPerdu.i18n');
 *
 * @param string ns namespace name
 * @param string root to put namespace in (optional!)
 *
 * Credit to Stamat: https://stamat.wordpress.com/2013/04/12/javascript-elegant-namespace-declaration/
 */
var namespace = function(ns, root) {
  var chunks = ns.split('.');

  if(!root) root = window;

  var current = root;

  for(var i = 0; i < chunks.length; i++) {
    if (!current.hasOwnProperty(chunks[i])) current[chunks[i]] = {};
    current = current[chunks[i]];
  }

  return current;
};

// define namespace
namespace('CorbeauPerdu.i18n');


/**
 * Constructor - define privates in here
 * @param string lang page running 'lang'
 * @param string domain default domain to retrieve data from
 * @param object json translation data of the default domain
 * @param boolean useCustomPluralForms use custom plural forms (if false, plural test will be done with DEFAULTPLURAL)
 * @param boolean debug if set, output info message and errors to console
 */
CorbeauPerdu.i18n.Locale = function (lang, domain, data, useCustomPluralForms, debug) {

  // -------------------------------------------------
  // INIT PRIVATE VARIABLES AND FUNCTIONS
  // -------------------------------------------------
  var _PLURALVALIDCHARS = '()%=&!?|:<>0123456789n'; // valid characters for plural: this should really be a constant, but not sure how within this class!
  var _DEFAULTPLURAL = '(n != 1)';     // default plural test (for use in *ngettext() functions, if none specified in JSON data)

  var _lang = lang,                    // not really used, but who knows when it could come in handy!
      _defaultDomain = domain,         // default lookup domain for translations!
      _loadedDomains = {},             // this holds the translations!
      _workingPlural = _DEFAULTPLURAL, // this will be the plural test we'll be using
      _useCustomPluralForms = useCustomPluralForms,
      _debug = debug,
      _formatMessages4Web = false,
      _formatMessages4WebInclPlaceholders = true;
  

  /**
   * _validJSON()
   * Checks to see if we got a proper JSON string
   *
   * @param string jsonString
   * @returns boolean
   */
  var _validJSON = function(jsonString){
    return jsonString instanceof Array || jsonString instanceof Object ? true : false;
  };

  /**
  * _evalPlural()
  * Evaluate the plural ternary test conditions and return plural array id to use for the matched condition
  *
  * @param string plural plural to evaluate
  * @param int n number to test plural with
  * @param string domain the working domain
  * @returns string translated / sprintf message if present, else original UNtranslated message
  */
  var _evalPlural = function(plural, n, workingDomain) {
    var retval;

    if(isNaN(n)) throw new CorbeauPerdu.i18n.LocaleException("Invalid 'n' number (e.g. item count) passed!", 6);

    var n = Math.abs(n); // positive 'n' for tests

    if ( _evalProperPluralChars(plural) )
    {
      try {
        retval = + eval(plural);  // use '+' in front of return value to convert value to integer !! Otherwise, can get a boolean returned!
      }
      catch(error) {
        if (workingDomain) {
          throw new CorbeauPerdu.i18n.LocaleException("Invalid 'plural' ternary conditions format in the '" + workingDomain + "' domain: '" + plural + "'\n\n" + error.message, 8);
        }
        else {
          throw new CorbeauPerdu.i18n.LocaleException("Invalid default 'plural' ternary conditions format specified: '" + plural + "'\n\n" + error.message, 8);
        }
      }
    }
    else {
      if (workingDomain) {
        throw new CorbeauPerdu.i18n.LocaleException("Invalid characters found in 'plural' value of the '" + workingDomain + "' domain: '" + plural + "'\n\nContent of 'plural' may only use the 'n' variable, and make use of the following characters (excluding the quotes): '" + _PLURALVALIDCHARS + "'", 7);
      }
      else {
        throw new CorbeauPerdu.i18n.LocaleException("Invalid characters found in the default 'plural' set: '" + plural + "'\n\nContent of 'plural' may only use the 'n' variable, and make use of the following characters (excluding the quotes): '" + _PLURALVALIDCHARS + "'", 7);
      }
    }
    return retval;
  }

  /**
   * _evalProperPluralChars()
   * A simple security check to make sure only certain characters are entered as the 'plural' value
   *
   * @param string plural
   * @return bool
   */
  var _evalProperPluralChars = function (plural)
  {
    // look for any invalid characters in $plural: if found any, return false / throw exception!
  if(plural.match('[^ ' + _escapeRegExp(_PLURALVALIDCHARS) + ']'))
    {
      return false;
    }

    return true;
  }

  /**
   * _escapeRegExp()
   * Escapes special characters from string to be used in a regex!
   *
   * @param string
   * @return string
   */
  var _escapeRegExp = function(string) {
    return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  /**
   * _stringToWeb()
   * Format a string for web output - - simple version: doesn't deal with accents! Just prevents quotes and html tags   
   * @param string $value
   * @param boolean $replaceLineBreaks replace '\n' with '<br/>'
   * @return string
   */
  var _stringToWeb = function (value, replaceLineBreaks) {
    
    if( replaceLineBreaks === undefined ){
      replaceLineBreaks = true;
	}
    
	var retval = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
	if(replaceLineBreaks == true) {
      retval = String(value).replace(/\n/g, '<br/>');
	}
	
	return retval;
  }
  
  // -------------------------------------------------
  // INIT PUBLIC VARIABLES AND FUNCTIONS
  // -------------------------------------------------

  /**
  * Getter for _loadedDomains
  * Get the loaded domains array
  * @returns associative array of all domains translations
  */
  this.getLoadedDomains = function(){
    return _loadedDomains;
  }

  /**
  * Getter for _lang
  * Get the running language/locale set
  * @returns string working lang
  */
  this.getLang = function(){
    return _lang;
  }

  /**
  * Getter for _workingPlural
  * Get the running plural
  * @returns string working plural tests
  */
  this.getWorkingPlural = function(){
    return _workingPlural;
  }

  /**
  * Setter for DEFAULTPLURAL
  * Set the default plural to use if not using from JSON data
  * @param string default plural to use if not using plural-forms from JSON data
  */
  this.setDefaultPlural = function(defaultPlural){

    // run a test case against the 'defaultPlural' conditions just to make sure it validates through eval() and doesn't return an exception
    try
    {
      _evalPlural(defaultPlural, 1);
      _DEFAULTPLURAL = defaultPlural;
    }
    catch (error)
    {
      throw error;
    }
  }

  /**
   * Setter for _formatMessages4WebInclPlaceholders
   * Format all returned messages for web output ? Default is false!
   * i.e. '<' becomes '&lt;', 'é' becomes &eacute; and also '\n' becomes '<br/>'
   * @param bool $formatMessages4Web
   * @return bool old value which was set
   */
  this.setFormatMessages4Web = function(v){
	var ov = _formatMessages4Web;
    _formatMessages4Web = v;
    return ov;
  }  
  
  /**
   * Setter for _formatMessages4WebInclPlaceholders
   * If formatMessages4Web is on, do we want to also format the placeholder values? Default is true!
   * @param bool $inclPlaceholders
   * @return bool old value which was set
   */
  this.setFormatMessages4WebInclPlaceholders = function(v){
    var ov = _formatMessages4WebInclPlaceholders;
	_formatMessages4WebInclPlaceholders = v;
	return ov;
  }
  
  /**
   * Getter for DEFAULTPLURAL
   * Set the default plural to use if not using from JSON data
   * @returns string default plural used if not using custom plurals from JSON data
   */
  this.getDefaultPlural = function(){
    return _DEFAULTPLURAL;
  }

  /**
   * loadDomain()
   * Sets the translations JSON array for a given domain
   *
   * @param string domain name to assign translations to
   * @param object data json translation data for domain
   */
  this.loadDomain = function(domain, data){

    // info msg only...
    if (_debug) console.log('Loading domain: ' + domain + '...');

    if (_validJSON(data)) {

      // load the data into loadedDomains
      _loadedDomains[domain] = data;

      if (_useCustomPluralForms) {
        var nplurals = _loadedDomains[domain][""]["nplurals"];
        var plural = _loadedDomains[domain][""]["plural"];

        // validate 'nplurals' value
        if ( (typeof nplurals === 'undefined') || (nplurals === null) || (nplurals.trim() === '') || (nplurals.match('^[^0-9]*$')) || ( nplurals < 0 ))
        {
          delete(_loadedDomains[domain]); // don't keep the translations, forcing the admin to fix the issue!
          throw new CorbeauPerdu.i18n.LocaleException("Missing or invalid 'nplurals' number in domain '" + domain + "'", 2);
        }
        // validate 'plural' value
        else if ( nplurals >= 1 )
        {
          // validate we have a plural value set!
          if ( (typeof plural === 'undefined') || (plural === null) || (plural.trim() === '') )
          {
            delete(_loadedDomains[domain]); // don't keep the translations, forcing the admin to fix the issue!
            throw new CorbeauPerdu.i18n.LocaleException("Missing 'plural' ternary test conditions in domain '" + domain + "'", 3);
          }
          // validate that $nplurals actually matches the number of ternary conditions found in $plural
          else if ( plural.split('?').length != nplurals )
          {
            delete(_loadedDomains[domain]); // don't keep the translations, forcing the admin to fix the issue!
            throw new CorbeauPerdu.i18n.LocaleException("The 'nplurals' value doesn't match the actual number of 'plural' conditions (number of possible returned values) in domain '" + domain + "'", 4);
          }
          // validate the key's plurals array count is equal to nplurals value: did the user provide right amount of plural translations per key!?
          else
          {
            for ( var key in _loadedDomains[domain] )
            {
              var value = _loadedDomains[domain][key];
              if ( ( key != '' ) && ( Array.isArray(value) ) && ( value.length != nplurals ) )
              {
                delete(_loadedDomains[domain]); // don't keep the translations, forcing the admin to fix the issue!
                throw new CorbeauPerdu.i18n.LocaleException("Possible plurals count (" + value.length + ") for key '" + key + "' in domain '" + domain + "' doesn't match the 'nplurals' value (" + nplurals + ") !", 5);
              }
            }
          }

          // trim the plural forms
          _loadedDomains[domain][""]["nplurals"] = _loadedDomains[domain][""]["nplurals"].trim();
          _loadedDomains[domain][""]["plural"] = _loadedDomains[domain][""]["plural"].trim();

          // run a test case against the 'plural' conditions just to make sure it validates through eval() and doesnt return an exception
          try {
            _evalPlural(_loadedDomains[domain][""]["plural"], 1, domain);
            _workingPlural = _loadedDomains[domain][""]["plural"];
          }
          catch (error) {
            delete(_loadedDomains[domain]); // don't keep the translations, forcing the admin to fix the issue!
            throw error;
          }
        }
      }

      // info msg only...
      if (_debug) console.log( '  loaded ' + (( _useCustomPluralForms ) ? 'with custom plural: ' : 'with default plural: ') + this.getWorkingPlural());
    }
    else {
      throw new CorbeauPerdu.i18n.LocaleException("Invalid JSON data for domain: '" + domain + "'", 1);
    }
  }

  /**
  * gettext()
  * Lookup a message in the current domain, singular form
  *
  * @param string message to translate
  * @param mixed v (optional!) value(s) to replace sprintf placeholders with
  * @returns string translated / sprintf message if present, else original UNtranslated message
  */
  this.gettext = function(message, v) {
    // just call the dgettext() with default domain
    var args = Array.prototype.slice.call(arguments);
    args.unshift(_defaultDomain); // put the default domain as first arg to pass to dgettext()
    return this.dgettext.apply(this, args);
  }

  /**
  * ngettext()
  * Lookup a message in the current domain, plural form
  *
  * @param string msgid1 The singular message ID
  * @param string msgid2 The plural message ID
  * @param int n The number (e.g. item count) to determine the translation for the respective grammatical number
  * @param mixed v (optional!) value(s) to replace sprintf placeholders with
  * @returns string translated / sprintf message if present, else original UNtranslated message
  */
  this.ngettext = function(msgid1, msgid2, n, v) {
    // just call the dngettext() with default domain
    var args = Array.prototype.slice.call(arguments);
    args.unshift(_defaultDomain); // put the default domain as first arg to pass to dngettext()
    return this.dngettext.apply(this, args);
  }

  /**
  * dgettext()
  * Lookup a message in a given domain, singular form
  *
  * @param string domain to retrieve message from
  * @param string message to translate
  * @param mixed v (optional!) value(s) to replace sprintf placeholders with
  * @returns string translated / sprintf message if present, else original UNtranslated message
  */
  this.dgettext = function(domain, message, v) {
    var translation, domainTranslations = _loadedDomains[domain];

    if (typeof domainTranslations === 'undefined' || domainTranslations === null) {
      if (_debug) console.error("Undefined domain: " + domain);
      translation = message;
    }
    else if ( (typeof domainTranslations[message] === 'undefined') || (domainTranslations[message] === null) || (domainTranslations[message].trim() === '') ) {
      if (_debug) console.warn("Undefined message in domain '" + domain + "': '" + message + "'");
      translation = message;
    }
    else {
      translation = domainTranslations[message];
    }

    // format messages for web output, excluding the placeholders values!
    if ( ( _formatMessages4Web === true ) && ( _formatMessages4WebInclPlaceholders === false ) ) translation = _stringToWeb(translation);
    
    // sprintf message?
    if (v) {
      var sprintf_args = Array.prototype.slice.call(arguments, 1); // don't keep the 'domain' argument
      sprintf_args[0] = translation;  // replace UNtranslated 'message' with translated one in arguments array, and pass the rest to sprintf()
      try {
        translation = sprintf.apply(null, sprintf_args);
      }
      catch (error) {
        console.error(error);
      }
    }

    // format messages for web output, including the placeholders values!
    if ( ( _formatMessages4Web === true ) && ( _formatMessages4WebInclPlaceholders === true ) ) translation = _stringToWeb(translation);

    return translation;
  }

  /**
  * dngettext()
  * Lookup a message in a given domain, plural form
  *
  * @param string domain The lookup domain to retrieve message from
  * @param string msgid1 The singular message ID
  * @param string msgid2 The plural message ID
  * @param int n The number (e.g. item count) to determine the translation for the respective grammatical number
  * @param mixed v (optional!) value(s) to replace sprintf placeholders with
  * @returns string translated / sprintf message if present, else original UNtranslated message
  */
  this.dngettext = function(domain, msgid1, msgid2, n, v) {
    var translation, domainTranslations = _loadedDomains[domain];

    if (typeof domainTranslations === 'undefined' || domainTranslations === null) {
      if (_debug) console.error("Undefined domain: " + domain);
      translation = msgid1;
    }
    else {
      // get the translations
      var translation_singular = domainTranslations[msgid1];
      if (typeof translation_singular === 'string') translation_singular = translation_singular.trim();

      var translation_plural = domainTranslations[msgid2];
      if (typeof translation_plural === 'string') translation_plural = translation_plural.trim();


      // ************************
      // using custom plurals, thus got a nplurals and plural set...
      if ( _useCustomPluralForms ) {
        var nplurals = domainTranslations['']['nplurals'];
        var plural = domainTranslations['']['plural'];

        // if the language as many plural forms, say NOT like Japanese (nplurals=1; plural=0;)
        // get the plural ternary test conditions and retrieve the right plural array value
        if ( nplurals >= 1 )
        {
          try {
            var plural_value_id = _evalPlural(plural, n, domain);

            // get the translations
            translation = translation_plural;

            // if we have a single nplurals, thus a single plural testcase (i.e. (n > 1)),
            // and test returned 'true', get the translation[0] (i.e. the first translation)
            if ( ( nplurals == 1 ) && ( plural_value_id == 1 ) )
            {
              if ( Array.isArray(translation) ) translation = translation[0].trim();

              // if we dont have a plural translation, set to $msgid2
              if ( (typeof translation === 'undefined') || (translation === null) || (translation === '') )
              {
                if (_debug) console.warn("Undefined message in domain '" + domain + "': '" + msgid2 + "'");
                translation = msgid2;
              }
            }
            // single nplural, but test returned false: return singular!
            else if ( ( nplurals == 1 ) && ( plural_value_id == 0 ) )
            {
              translation = translation_singular;

              // if we dont have a singular translation, set to $msgid1
              if ( (typeof translation === 'undefined') || (translation === null) || (translation === '') )
              {
                if (_debug) console.warn("Undefined message in domain '" + domain + "': '" + msgid1 + "'");
                translation = msgid1;
              }
            }
            // everything else: get the right array value based on ternary conditions returned from evalPlural()
            else
            {
              if ( Array.isArray(translation) )
              {
                translation = translation[plural_value_id].trim();
              }
              else
              {
                // if our available translations is just a single string (a.k.a NOT an array!), it's a mistake since we should have many plurals available at this point ($nplurals >=2 )
                // ditch the single string translation! Otherwise, kinda dumb to keep it as THE right translation!
                translation = undefined;
              }

              if ( (typeof translation === 'undefined') || (translation === null) || (translation === '') ){
                if (_debug) console.warn("Undefined message in domain '" + domain + "': '" + msgid2 + "' [array id: " + plural_value_id + "]");
                translation = msgid2; // gettext, here, would return the singular untranslated text... I prefer the plural, since we did get a return value from the plurals test conditions!
              }
            }
          }
          catch (error){
            translation = msgid1;
            console.error("Plural evaluation for key '" + msgid1 + "' caused an exception with plural ('" + plural + "'):\n\n" + error.message);
          }
        }
        // we have no plural values possible for the language (i.e. nplurals=0 ),
        // meaning the language has no plural! Return singular form...
        else
        {
          translation = translation_singular;
          // if we dont have a singular translation, set to msgid1
          if ( (typeof translation === 'undefined') || (translation === null) || (translation === '') )
          {
            if (_debug) console.warn("Undefined message in domain '" + domain + "': '" + msgid1 + "'");
            translation = msgid1;
          }
        }
      }
      // ************************
      // _useCustomPluralForms is set to FALSE,
      // then just do a check for plural against _DEFAULTPLURAL to set 1st plural value, if applicable
      else {
        try {
          var plural_value_id = _evalPlural(_DEFAULTPLURAL, n);

          if(plural_value_id == 1){ // set plural value

            // not using plurals, so just get the 1st possible plural value
            translation = Array.isArray(translation_plural) ? translation_plural[0].trim() : translation_plural;

            // if we dont have a plural translation, set to $msgid2
            if ( (typeof translation === 'undefined') || (translation === null) || (translation === '') ){
              if (_debug) console.warn("Undefined message in domain '" + domain + "': '" + msgid2 + "'");
              translation = msgid2;
            }
          }
          // returned false, set singular message; if none, set to msgid1
          else {
            translation = translation_singular;
            if ( (typeof translation === 'undefined') || (translation === null) || (translation === '') )
            {
              if (_debug) console.warn("Undefined message in domain '" + domain + "': '" + msgid1 + "'");
              translation = msgid1;
            }
          }
        }
        catch (error){
          translation = msgid1;
          console.error("Plural evaluation for key '" + msgid1 + "' caused an exception with default plural ('" + _DEFAULTPLURAL + "'):\n\n" + error.message);
        }
      }
    }

    // format messages for web output, excluding the placeholders values!
    if ( ( _formatMessages4Web === true ) && ( _formatMessages4WebInclPlaceholders === false ) ) translation = _stringToWeb(translation);
    
    // sprintf message?
    if (v) {
      var sprintf_args = Array.prototype.slice.call(arguments, 4); // don't keep the domain, msgid1, msgid2, n arguments
      sprintf_args.unshift(translation); // set the message to sprintf as 1st arg, and pass it all to sprintf()
      try {
        translation = sprintf.apply(null, sprintf_args);
      }
      catch (error) {
        console.error(error);
      }
    }

    // format messages for web output, including the placeholders values!
    if ( ( _formatMessages4Web === true ) && ( _formatMessages4WebInclPlaceholders === true ) ) translation = _stringToWeb(translation);
    
    return translation;
  }

  /**
  * _() Alias to gettext()
  * Lookup a message in the current domain, singular form
  *
  * @param string message to translate
  * @param mixed v (optional!) value(s) to replace sprintf placeholders with
  * @returns string translated / sprintf message if present, else original UNtranslated message
  */
  this._ = function(message, v) {
    // just call the dgettext() with default domain
    var args = Array.prototype.slice.call(arguments);
    args.unshift(_defaultDomain); // put the default domain as first arg to pass to dgettext()
    return this.dgettext.apply(this, args);
  }

  /**
  * _n() Alias to ngettext()
  * Lookup a message in the current domain, plural form
  *
  * @param string msgid1 The singular message ID
  * @param string msgid2 The plural message ID
  * @param int n The number (e.g. item count) to determine the translation for the respective grammatical number
  * @param mixed v (optional!) value(s) to replace sprintf placeholders with
  * @returns string translated / sprintf message if present, else original UNtranslated message
  */
  this._n = function(msgid1, msgid2, n, v) {
    // just call the dngettext() with default domain
    var args = Array.prototype.slice.call(arguments);
    args.unshift(_defaultDomain); // put the default domain as first arg to pass to dngettext()
    return this.dngettext.apply(this, args);
  }

  /**
  * _d() Alias to dgettext()
  * Lookup a message in a given domain, singular form
  *
  * @param string domain to retrieve message from
  * @param string message to translate
  * @param mixed v (optional!) value(s) to replace sprintf placeholders with
  * @returns string translated / sprintf message if present, else original UNtranslated message
  */
  this._d = function(domain, message, v) {
    return this.dgettext.apply(this, Array.prototype.slice.call(arguments));
  }

  /**
  * _dn() Alias to dngettext()
  * Lookup a message in a given domain, singular form
  *
  * @param string domain The lookup domain to retrieve message from
  * @param string msgid1 The singular message ID
  * @param string msgid2 The plural message ID
  * @param int n The number (e.g. item count) to determine the translation for the respective grammatical number
  * @param mixed v (optional!) value(s) to replace sprintf placeholders with
  * @returns string translated / sprintf message if present, else original UNtranslated message
  */
  this._dn = function(domain, msgid1, msgid2, n, v) {
    return this.dngettext.apply(this, Array.prototype.slice.call(arguments));
  }

  // -------------------------------------------------
  // LOAD THE DEFAULT DOMAIN
  // -------------------------------------------------

  // just an info msg
  if (_debug) console.log("Locale is loading with lang: " + lang);

  // load the default domain translations
  try {
    this.loadDomain(domain, data);
  }
  catch (error) {
    //throw error;
    console.error(error); // not throwing back otherwise 'Locale' object won't get created and all the calls to gettext() won't at least show just the keys!
  }
}


/**
 * Locale Exception class
 * @param string error message
 * @param int error code

class LocaleException extends Error {
  constructor(message, code) {
    super(message);
    this.name = "LocaleException";
    this.code = code;
  }
}
 */

/**
 * Locale Exception class
 * @param string error message
 * @param int error code
 */
CorbeauPerdu.i18n.LocaleException = function(message, code) {
  const error = new Error(message);
  error.code = code;
  error.name = "LocaleException";
  return error;
}
