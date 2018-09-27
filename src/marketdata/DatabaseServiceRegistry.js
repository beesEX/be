/**
 * @author son87.lengoc@gmail.com
 * Created by Ngoc Son Le.
 */

class DatabaseServiceRegistry {

  constructor(){

    this.mapOfCollectionNameAndDatabaseService = {};

  }

  register(collectionName, databaseService) {

    this.mapOfCollectionNameAndDatabaseService[collectionName] = databaseService;

  }

  getDatabaseServiceByCollectionName(collectionName){

    return this.mapOfCollectionNameAndDatabaseService[collectionName];

  }

}

module.exports = {

  DATABASE_SERVICE_REGISTRY: new DatabaseServiceRegistry()

};