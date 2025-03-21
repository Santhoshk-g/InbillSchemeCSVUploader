import { LightningElement,api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getrecord from '@salesforce/apex/DataTableActionsController.getrecord';
import { subscribe, unsubscribe, onError}  from 'lightning/empApi';
import csvFileRead from '@salesforce/apex/CSVFileReadLWCCntrl.csvFileRead';
import myresources from '@salesforce/resourceUrl/InBillTemplate';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import {encodeDefaultFieldValues} from 'lightning/pageReferenceUtils';
import { deleteRecord } from 'lightning/uiRecordApi';
import getsearchrecord from '@salesforce/apex/DataTableActionsController.getsearchrecord';
import LightningConfirm from "lightning/confirm";
//import Approvalprocess from "@salesforce/apex/DataTableActionsController.Approvalprocess";


const actions = [
    { label: 'Edit', name: 'edit' },
    { label: 'Delete', name: 'Delete'},

];

const columns = [
    
    { label: 'Customer Name', fieldName: 'Customer_Name__c',initialWidth: 200},
    { label: 'Customer Code', fieldName: 'Customer_Code__c',initialWidth: 140},
    { label: 'Product', fieldName: 'Product__c',initialWidth: 100},
    { label: 'Product category', fieldName: 'Product_category__c',initialWidth: 140}, 
    { label: 'Volume(Tons)', fieldName: 'Volume_Tons__c',initialWidth: 134},
    { label: 'Thickness From', fieldName: 'Thickness_From__c',initialWidth: 134},
    { label: 'Thickness To', fieldName: 'Thickness_To__c',initialWidth: 120},
    { label: 'In bill Rate', fieldName: 'In_bill_Rate_mm__c',type:'currency',initialWidth: 110},
    { label: 'Valid From', fieldName: 'Valid_From__c',initialWidth: 134},
    { label: 'Valid To', fieldName: 'Valid_To__c',initialWidth: 134},
    { label: 'Spend', fieldName: 'Spend_Formula__c',initialWidth: 90},
    {
        type: 'action',
        typeAttributes: { rowActions: actions },
    },
];

export default class DataTableActions extends NavigationMixin( LightningElement ) {

    columns = columns;
    data = [];
    @track error = false;
    @api recordId;
    rowid;
    loaded = false;
    @api templatefile = myresources;
    searchvalue;
    @track iscallanotherLWC = false;
    @track size = 0;
    subscription = {};
    @track PriceError;
    datatable = false;
    pageSize = 25;
    pageNumber = 1;
    recordsToDisplay = [];
    CHANNEL_NAME = '/event/Refresh_Record_Event__e';

    connectedCallback() {
        this.fetchAccounts();
        subscribe(this.CHANNEL_NAME, -1, this.manageEvent).then(response => {
            console.log('Subscribed Channel');
            this.subscription = response;
        });
        onError(error => {
            console.error('Server Error--->'+error);
        });
    }

    manageEvent = event=> {
        const refreshRecordEvent = event.data.payload;
        console.log('Event--->'+JSON.stringify(refreshRecordEvent));
        this.fetchAccounts();

    }
    fetchAccounts() {
        getrecord({inbids : this.recordId})
            .then(result => {
                this.data = result;
            if(this.data == null || this.data == ''){
                this.datatable = false; 
                 }else{
                  this.datatable = true;   
                 }
                this.size = result.length;
                this.error = undefined;
                this.paginationHelper();
            })
            .catch(error => {
                this.PriceError = error.body.message;
                this.data = undefined;
                
            });
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        this.rowid = row.Id;
        switch (actionName) {
            case 'edit':
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: row.Id,
                        objectApiName: 'In_Bill_Scheme_Detail__c',
                        actionName: 'edit'
                    }
                });
                break;
                case 'Delete':
                this.deleterecordmethod();
               
                default:
        }
    }
    async deleterecordmethod(){
       
       const result = await LightningConfirm.open({
            message: "Are you sure you want to delete this?",
            variant: "inverse",
            label: "Confirm Delete"
        });
        if(result){
                    deleteRecord(this.rowid)
                        .then(() => {
                            this.dispatchEvent(
                                new ShowToastEvent({
                                    title: 'Success',
                                    message: 'Record deleted',
                                    variant: 'success'
                                }), 
                            ); 
                         });
        }
        else{

        }     
    }       

    disconnectedCallback() {
        unsubscribe(this.subscription, response => {
            console.log('Unsubscribed Channel');
        });
    }
    get acceptedCSVFormats() {
        return ['.csv'];
    }
    uploadFileHandler(event) {
        // Get the list of records from the uploaded files
        const uploadedFiles = event.detail.files;
         this.loaded = true;
        
    

        // calling apex class csvFileread method
        csvFileRead({contentDocumentId : uploadedFiles[0].documentId,InbillID : this.recordId})
        .then(result => {
            window.console.log('result ===> '+result);
           // if(this.data == null || this.data == ''){
               // this.PriceError= 'Not Inserted';
               // this.error = true;
            //}else{
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success!!',
                    message: 'Records are created according to the CSV file upload!!!',
                    variant: 'Success',
                }),
            );
            this.error=false;
           // }   
        })
        .catch(error => {
            this.loaded = false;
            this.PriceError = error.body.message;
            this.error = true;    
        })
        
    }

    NavigateToNewInBillScheme (){
        const defaultvalues = encodeDefaultFieldValues ({
            In_bill_Scheme__c : this.recordId
        })
        this[NavigationMixin.Navigate]({
            type :'standard__objectPage',
            attributes : {
                 objectApiName:'In_Bill_Scheme_Detail__c',
                 actionName : 'new'
          },
          state:{
            defaultFieldValues: defaultvalues,
            navigationLocation: 'RELATED_LIST'
          }
        });
        

       }
     

       exportData(){
        let rowEnd = '\n';
            let csvString = '';
            // this set elminates the duplicates if have any duplicate keys
            let rowData = new Set();
    
            // getting keys from data
            this.data.forEach(function (record) {
                Object.keys(record).forEach(function (key) {
                    rowData.add(key);
                });
            });
    
            // Array.from() method returns an Array object from any object with a length property or an iterable object.
            rowData = Array.from(rowData);
            
            // splitting using ','
            csvString += rowData.join(',');
            csvString += rowEnd;
    
            // main for loop to get the data based on key value
            for(let i=0; i < this.data.length; i++){
                let colValue = 0;
    
                // validating keys in data
                for(let key in rowData) {
                    if(rowData.hasOwnProperty(key)) {
                        // Key value 
                        // Ex: Id, Name
                        let rowKey = rowData[key];
                        // add , after every value except the first.
                        if(colValue > 0){
                            csvString += ',';
                        }
                        // If the column is undefined, it as blank in the CSV file.
                        let value = this.data[i][rowKey] === undefined ? '' : this.data[i][rowKey];
                        csvString += '"'+ value +'"';
                        colValue++;
                    }
                }
                csvString += rowEnd;
            }
    
            // Creating anchor element to download
            let downloadElement = document.createElement('a');
    
            // This  encodeURI encodes special characters, except: , / ? : @ & = + $ # (Use encodeURIComponent() to encode these characters).
            downloadElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvString);
            downloadElement.target = '_self';
            // CSV File Name
            downloadElement.download = 'In bill Scheme Data.csv';
            // below statement is required if you are using firefox browser
            document.body.appendChild(downloadElement);
            // click() Javascript function to download CSV file
            downloadElement.click(); 
        }

    handlesearch(event){
            this.searchvalue = event.target.value;
            this.imperativecall();
    }
    imperativecall(){
        getsearchrecord({inbids:this.recordId,svalue:this.searchvalue})
        .then((result)=>{
            this.recordsToDisplay = result;
            
        })
        .catch((error)=>{
            console.log('Error on search',error);
        })
    }

    previousPage() {
        this.pageNumber = this.pageNumber - 1;
        this.paginationHelper();
    }
    nextPage() {
        this.pageNumber = this.pageNumber + 1;
        this.paginationHelper();
    }

    paginationHelper() {
        this.recordsToDisplay = [];
        // calculate total pages
        this.totalPages = Math.ceil(this.size /this.pageSize);
        // set page number 
        if (this.pageNumber <= 1) {
            this.pageNumber = 1;
        } else if (this.pageNumber >= this.totalPages) {
            this.pageNumber = this.totalPages;
        }
        // set records to display on current page 
        for (let i = (this.pageNumber - 1) * this.pageSize; i < this.pageNumber * this.pageSize; i++) {
            if (i === this.size) {
                break;
            }
                this.loaded = false;
            this.recordsToDisplay.push(this.data[i]);
        }
    }
}
