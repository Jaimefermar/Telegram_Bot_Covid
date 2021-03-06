/******************************************************************************
Telegram Bot for acces control in Covid-19 situation.
Created by Jaime F.M.
Nov 28 , 2021 
https://github.com/Jaimefermar/Telegram_Bot_Covid
This code is released under the [MIT License](http://opensource.org/licenses/MIT).
Please review the LICENSE.md file included with this example. If you have any questions 
or concerns with licensing, please contact jaime.fermar01@gmail.com 
Distributed as-is; no warranty is given.
******************************************************************************/

var token = "Telgram token";   //Token created by telegram for your unique bot 
var url = "https://api.telegram.org/bot"+token;
var webAppUrl = "WebApp urll";   //WebApp url generated by Google when you implement it 
var ssId = "google sheet id"; //Id for the google sheet used primary as database where the for register it responses
var formId = "google form id" //Id for the google form where people without the telegram bot can register it acces 
var adminId = "telegam id"   //Admin id telegram

function getMe() {
  var response = UrlFetchApp.fetch(url + "/getMe");
  Logger.log(response.getContentText());
}

function getUpdates() {
  var response = UrlFetchApp.fetch(url + "/getUpdates");
  Logger.log(response.getContentText());
}

function setWebhook() {   //You must run this method at least once to set the webhook for the telegram bot
  var response = UrlFetchApp.fetch(url + "/setWebhook?url=" + webAppUrl);
  Logger.log(response.getContentText());
}

function doGet(e) {
  return HtmlService.createHtmlOutput("Hello" + JSON.stringify(e));
}

function doPost(e) {  //Main function executed when the bot recives a new message from any user 
  var task = getTask();
  var contents = JSON.parse(e.postData.contents);
  var text = contents.message.text;   //Text sent by the user
  var id = contents.message.from.id;    //Telgram id of the user who sent the message , it´s unique and is used to answer
  var name = contents.message.from.first_name;    //Name seted by the user in telegram 
  if (task == "Primary"){  //Primary bot function
   if (searchIdDatosPersonales(id)==null){  //The user had never gave his personal info
    sendText(id,"Veo que no tengo tus datos personales, te los voy a pedir.");  //The bot ask the user for his personal info 
    datos(id,task);
   } else { //The user has already given his personal info 
    if (text == '/start') {
        start(name,id);
      }
    else if (text == '/entrada') {    //Register the entrance to the local
        entrada(id, name);
      }  
    else if (text == '/salida') {   //Register the exit of the local 
        salida(id,name);
      }
    else if (text == '/aforo') {    //Send the user the amount of people actually at the local
        aforo(id,name);
      }
    else if (text == '/personas'){    //Send the user the names of the polple at the local
        personas(id,name);
      }
    else if (text == '/datos'){   //Private function to test the personal info adqusition 
        datos(id,name,task);
       }
    else if (text == '/expulsar'){   //Private function to eject pepople
        deleteUser(text,id);
       }
    else {    //The user did not sent any function
    sendText(id,"Hola "+name +" te recuerdo que estos son los comandos que puedes utilizar de momento:  /entrada - Registra tu entrada al local del Eco de Teleco   /salida - Registra tu salida del local del Eco de Teleco  /aforo - Consulta la ocupación actual del local del Eco de Teleco ");
    }
   }
  }
  else if(isMe(id)){  //The user is the one who started the chat for personal info request 
    task = getTask();
    if (task =="Asking for name"){   //Waiting for the message with the name
      escribirDatos(text,id,name,task);
      sendText(id,"DNI: ");
      setTask("Asking for dni",id);
     }
    else if (task =="Asking for dni"){   //Waiting for the message with the dni
      escribirDatos(text,id,name,task);
      sendText(id,"Número de teléfono: ");
      setTask("Asking for tlf",id);
    }
    else if (task =="Asking for tlf"){   //Waiting for the message with the telephone number
      escribirDatos(text,id,name,task);
      sendText(id,"Tus datos han sido registrados correctamente, puedes seguir con tu actividad. ");
      setTask("Primary",id);
    }
    else if (task =="Asking for user"){   //Waiting for the admin to give the name to delete 
      deleteUser(text,id);
      setTask("Primary",id);
    }
  } else {  //The user is not the one who requested the personal info and the user have to wait
    sendText(id, "Estoy ocupado pidiendole los datos a otra persona, espera un momento y vuelve a intentarlo.")
  } 
  
}

function entrada(id, name){
  if(getAforo()>=8){ 
        sendText(id,"Lo siento mucho pero el aforo en estos momentos está completo, debes echar a alguien del Eco para poder registrar tu entrada.");
      } else {
        resultado=searchNameBd(name)
          if(resultado==null){
            registroEntrada(id,name);
            entradaBd(name,id);
           sendText(id,"Tu entrada ha sido registrada, no olvides registrar la salida al marcharte.")
          } else {
            sendText(id,"Se supone que deberías estar en el Eco, si no es así es que se te olvidó registrar tu última salida hoy. Tu entrada no ha sido registrada.");
          } 
        }
}

function start(id, name){
  sendText(id, "Hola" + nombre +"Bienvenid@ al controlador de aforo del Eco de Teleco. Lo primero que debes hacer es /datos para dar tus datos de contacto, esto solo será ncesario una vez. Recuerda que siempre que entres al Eco debes registrar tu entrada con /entrada y aún más importante, cuando salgas del Eco registra tu salida con /salida para permitir que el resto de l@s redactor@s puedan acceder. Ten en cuenta que puedes consultar en cualquier momento la ocupación del local con /aforo.  Tambiénn puedes consultar las personas que se encuentran actualmente en el Eco con /personas. Si vienes con gente que no pueda acceder a mí, pueden seguir usando los códigos QR para registrar la entrada y la salida, las bases de datos están sincronizadas. Disfruta del Eco!")    
}

function salida(id, name){
  if(getAforo==0){ 
        sendText(id,"Parece que se te ha olvidado registrar tu entrada porque el aforo actual es de cero personas.");
        }
        else{
          resultado = salidaBd(name);
          if(resultado == null){
            sendText(id, "En estos momentos no tienes ninguna entrada activa, quizá se te olvidó registrar tu entrada.")
          }else {
           registroSalida(id,name);
           sendText(id, "Tu salida ha sido registrada, puedes ir en paz.");
          }
        }
}

function aforo(id, name){
  var aforo = getAforo();
        if (aforo==1){
         sendText(id, "La ocupación actual en el Eco de Teleco es de " + aforo + " persona.");
        } else if (aforo>1){
          sendText(id, "La ocupación actual en el Eco de Teleco es de " + aforo + " personas.");
        } else {
          sendText(id, "ME CAGO EN MIS MUERTOS QUE ALGUIEN NO SE BORRÓ ANOCHE");
        }
}

function personas(id, name){
  if(getAforo()>0){
       sendText(id, "Actualmente el Eco se encuentra poblado " +getAforo()+ " seres, de los cuales te puedo mencionar a " + getPersonas());
     } else {
       sendText(id, "Ahora mismo el Eco está completamente vacío o ha sido tomadao por tropas enemigas")
     }
}

function datos(id,task){
  if (searchIdDatosPersonales(id)!=null){  //Si el usuario ya ha dado sus datos de contact
        sendText(id, "Ya has dado tus datos de contacto anteriormente.");
     } else {   //Pide los datos personales al usuario    
       if (task == "Primary"){ //Se pide el nombre
          sendText(id, "Introduce tus datos de contacto por favor. ");
          sendText(id, "Nombre y apellidos: ");
          setTask("Asking for name",id);
       } else {
         sendText(id,"FALTAL ERROR");
       }
     }
}

function sendText(id, text) {
  var response = UrlFetchApp.fetch(url + "/sendMessage?chat_id=" + id + "&text=" + text);
  Logger.log(response.getContentText());
}

function registroEntrada(id,name) {
  var test_form = FormApp.openById(formId);
  var FormResponse = test_form.createResponse();
  var questions = test_form.getItems();
  var qt = questions[0].asMultipleChoiceItem();
  var qr = qt.createResponse('Entrada');
  FormResponse.withItemResponse(qr );
  var qt = questions[1].asTextItem();
  var qr = qt.createResponse(name);
  FormResponse.withItemResponse(qr );
  FormResponse.submit();
  cargarControlAcceso(id);
}

function registroSalida(id,name) {
  var test_form = FormApp.openById(formId);
  var FormResponse = test_form.createResponse();
  var questions = test_form.getItems();
  var qt = questions[0].asMultipleChoiceItem();
  var qr = qt.createResponse('Salida');
  FormResponse.withItemResponse(qr );
  var qt = questions[1].asTextItem();
  var qr = qt.createResponse(name);
  FormResponse.withItemResponse(qr );
  FormResponse.submit();
  cargarControlAcceso(id);
}

function getAforo() {
  return SpreadsheetApp.openById(ssId).getRange("E2").getValue();
}

function entradaBd(name,id){
  SpreadsheetApp.openById(ssId).getSheetByName("Registrados").appendRow([new Date(),name,id]);
}

function salidaBd(name){
  //name = "Jaime"
  var row = searchNameBd(name);
  if (row==null){
    return null;
  } else {
    SpreadsheetApp.openById(ssId).getSheetByName("Registrados").deleteRow(row);
    return 1;
  }
}

function searchNameBd(name){
 //name = "Jaime"
  var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Registrados");
  var range = sheet.getRange("A1:B20");
  for (var i=1;i<20;i++) {
    var value = range.getCell(i,2).getValue();
    if (value == name){
      var date = range.getCell(i,1).getValue().getDate();
      var actualDate = new Date().getDate();
      if(date<actualDate){
        range.getCell(i,1).setValue(new Date());
        return true;
      } else {
        return i;
      }
    }
  }
  return null
}

function searchIdDatosPersonales(id){
 //name = "Jaime"
  var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Datos contacto");
  var range = sheet.getRange("A1:E35");
  for (var i=2;i<36;i++) {
    var value = range.getCell(i,4).getValue();
    if (value == id){
      return i;
    }
  }
  return null
}

function getPersonas(){
  var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Registrados");
  var range = sheet.getRange("B1:B20");
  var personas = range.getValues().filter(String);
  return personas;
}

function escribirDatos(data,id, name,task){   //escribe los datos obtenidos del usuario en la hoja de información personal según su columna
  var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Datos contacto");
  var lastRow = sheet.getLastRow();

  if (task == "Asking for name"){
    lastRow=lastRow+1 
    i=1;
  } else if(task == "Asking for dni"){
    i=2;
  } else if(task == "Asking for tlf"){
    i=3;
    sheet.getRange(lastRow,4).setValue(id);
    sheet.getRange(lastRow,5).setValue(name);
  }
  sheet.getRange(lastRow,i).setValue(data);
}

function getTask(){
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Datos contacto");
    return sheet.getRange("G1").getValue();
}

function setTask(task,id){
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Datos contacto");
    sheet.getRange("G1").setValue(task);
    setTaskUser(id,task);
}

function setTaskUser(id,task){
  var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Datos contacto");
  if (task == "Primary"){   //Volver a task Primary y no tener en cuenta ocupación 
    sheet.getRange("I1").setValue("");
      sheet.getRange("H1").setValue("");
  } else {    //Establecer id del usuario que tiene el bot ocupado y su inicio de ocupación 
    sheet.getRange("I1").setValue(new Date());
    sheet.getRange("H1").setValue(id);
  }
}

function getTaskUser(){
  var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Datos contacto");
  return sheet.getRange("H1").getValue();
}

function getTaskTime(){
  var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Datos contacto");
  return sheet.getRange("I1").getValue();
}

function deleteOldUsers(){
  const date = new Date();
  const ageInDays = 1;
  const threshold = new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      date.getDate() - ageInDays)
                    .getTime();
  var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Registrados"); //Open the Registrados sheet
  const values = 
     sheet
     .getRange('A:A') // Gets the first column assuming that this column have he form submissions timestamps
     .getValues() // Gets the values (timestamps). This returns a 2D array
     .flat(); // Flattening the values (Converts the 2D array into a 1D array)
  for (var i = values.length - 1; i >= 0;  i--) {
    if (
        values[i].getTime // Checks if the value is a date object
        && values[i].getTime() >= threshold 
       )
    {
      sheet.deleteRow(i+1); // This operation is very slow but good enough when deleting few rows
    } else {
      // do nothing
    }
  } 
}

function deleteAllUsers(){      //This function autoexecutes itself before the day has ended 
  var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Registrados"); //Open the Registrados sheet
  var registrados = sheet.getLastRow(); //Get the number of registered people right now 
  for (var i = 1; i < registrados+1;  i++) { //Delete users one by one, registering the exit
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Registrados"); //Update the sheet for the new order
    var name = sheet.getRange(1,2).getValue();
    var id = sheet.getRange(1,3).getValue();
    sendText(id,"Hola, soy el bot del Eco. Creo que estas no son horas de seguir en el Eco y te voy a expulsar, gracias por la confianza.");
    salida(id,name);
  } 
}

function cargarControlAcceso(id){
  Utilities.sleep(500);
  var destino = SpreadsheetApp.openById(ssId).getSheetByName("Control Acceso");
  var origen = SpreadsheetApp.openById(ssId).getSheetByName("Datos contacto");
  var lastRow = destino.getLastRow();
  comprobarAnterior(lastRow-1);
  var contactRow = searchIdDatosPersonales(id);
  for (var i=3;i<6;i++){
    var datoOrigen = origen.getRange(contactRow,i-2).getValue();
    destino.getRange(lastRow,i).setValue(datoOrigen);
  }
}

function comprobarAnterior(row){
  var destino = SpreadsheetApp.openById(ssId).getSheetByName("Control Acceso");
  var origen = SpreadsheetApp.openById(ssId).getSheetByName("Respuestas de formulario 1");
  if (destino.getRange(row,3).getValue()==""){ //La fila está vacía así que se actualiza
    var datoOrigen = origen.getRange(row,3).getValue();
    destino.getRange(row,5).setValue(datoOrigen);
    destino.getRange(row,3).setValue("Persona poco frecuente");
    comprobarAnterior(row-1);
  } else {  //La fila no estaba vacía
    //Do nothing 
  }
}

function isMe(id){
  var taskUser = getTaskUser();
  var time = getTaskTime().getTime();
  var actual = new Date().getTime();
  var margen = 30; //Margen del tiempo que espera a la respuesta
  if (taskUser==""){  //Si no hay usuarios activos 
    return true
  }
  if (id == taskUser){ //El usuario es el que esá activo 
    if (actual-time<1000*margen){ //Si el tiempo aún no ha expirado 
      return true  //Devuelve válido 
    } else {  //El timepo ha expirado 
      setTask("Primary",id)
    return false;  //Time out
    }
  } else {  //El usuario no es el que está activo
    if(actual-time<1000*margen){ //El tiempo aun no ha expirado
      return false //Bot ocupado
    } else {   //Ha expirado
      setTask("Primary",id) //Vuelve al estado inicial;
      return true;  
    }
  }
}

function deleteUser(text, id){
  if (getTask()=="Primary"){  //The admin has not mention the comand yet
    if (id == adminId){   //Only works if the message is from the admin 
      sendText(id,"Pon el nombre del usuario que quieras eliminar");
      setTask("Asking for user",id);
    } else { 
      sendText(id, "No se como has descubierto este comando, pero como no eres el admin no lo puedes usar")
    }
  } 
  else if (getTask()=="Asking for user"){   //The bot is asking for the admin to give the name
    var row = searchNameBd(text);
    if (row == null){
      sendText(id,"Lo has escrito mal");
    }
    else {    
      var sheet = SpreadsheetApp.openById(ssId).getSheetByName("Registrados");
      var deleteId = sheet.getRange(row, 3).getValue();
      salida(deleteId,text);
      sendText(id,"Hijo de puta eliminado correctamente");
      sendText(deleteId, "El vocal covid del eco ha visto que se te ha olvidado registrar tu salida así que te ha expulsado del eco. La próxima vez no olvides registrar tu salida. Gracias. ");
    }
  }
}

function test(){    //Function for testing
  
}

