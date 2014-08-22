<import resource="classpath:/alfresco/templates/webscripts/org/alfresco/repository/forms/pickerresults.lib.js">

function main()
{
   var argsFilterType = args['filterType'],
      argsSelectableType = args['selectableType'],
      argsSearchTerm = args['searchTerm'],
      argsMaxResults = args['size'],
      argsXPath = args['xpath'],
      argsRootNode = args['rootNode'],
      pathElements = url.service.split("/"),
      parent = null,
      rootNode = companyhome,
      results = [],
      categoryResults = null,
      resultObj = null,
      lastPathElement = null;
   
   if (logger.isLoggingEnabled())
   {
      logger.log("argsSelectableType = " + argsSelectableType);
      logger.log("argsFilterType = " + argsFilterType);
      logger.log("argsSearchTerm = " + argsSearchTerm);
      logger.log("argsMaxResults = " + argsMaxResults);
      logger.log("argsXPath = " + argsXPath);
   }
         
   try
   {
      // default to max of 100 results
      var maxResults = 100;
      if (argsMaxResults != null)
      {
         // force the argsMaxResults var to be treated as a number
         maxResults = parseInt(argsMaxResults, 10) || maxResults;
      }
      
      
	if (argsSelectableType == "cm:person")
	{
		findColleaguesUsers(argsSearchTerm, maxResults, results);
	}
	else if (argsSelectableType == "cm:authorityContainer")
	{
		findColleaguesGroups(argsSearchTerm, maxResults, results);
	}
      
      if (logger.isLoggingEnabled())
         logger.log("Found " + results.length + " results");
   }
   catch (e)
   {
      var msg = e.message;
      
      if (logger.isLoggingEnabled())
         logger.log(msg);
      
      status.setCode(500, msg);
      
      return;
   }

   model.parent = parent;
   model.rootNode = rootNode;
   model.results = results;
}

function isItemSelectable(node, selectableType)
{
   var selectable = true;
   
   if (selectableType !== null && selectableType !== "")
   {
      selectable = node.isSubType(selectableType);
      
      if (!selectable)
      {
         // the selectableType could also be an aspect,
         // if the node has that aspect it is selectable
         selectable = node.hasAspect(selectableType);
      }
   }
   
   return selectable;
}

/* Sort the results by case-insensitive name */
function sortByName(a, b)
{
   return (b.properties.name.toLowerCase() > a.properties.name.toLowerCase() ? -1 : 1);
}

function findColleaguesUsers(filterTerm, maxResults, results)
{
	var sites = siteService.listUserSites(person.properties.userName ); 

	var addedMembers= new Array();
	
	for (var i = 0; i < sites.length; i++) {
		var site = siteService.getSite(sites[i].shortName);
		
		if (filterTerm !== null && filterTerm != "")
		{
			filterTerm = "*" + filterTerm + "*";
		}

		var members = site.listMembers(filterTerm, null, 0, true);
    
		for (var member in members) {
			if (addedMembers.indexOf(member) < 0) {
				addedMembers.push(member);
			
				results.push(
						{
							item: createPersonResult(people.getPerson(member)),
							selectable: true
						});
			}
		}
	}
}

function findColleaguesGroups(filterTerm, maxResults, results)
{
	var sites = siteService.listUserSites(person.properties.userName ); 

	var addedMembers= new Array();
	
	for (var i = 0; i < sites.length; i++) {
		var site = siteService.getSite(sites[i].shortName);

		if (filterTerm !== null && filterTerm != "")
		{
			filterTerm = "*" + filterTerm + "*";
		}
   
		var members = site.listMembers(filterTerm, null, 0, false);
   
		for (var member in members) {
			if (member.lastIndexOf("GROUP_", 0) === 0) {
				member = member.replace("GROUP_", "");

				if (addedMembers.indexOf(member) < 0) {
					addedMembers.push(member);
		
					var group = groups.getGroup(member);
			  
					results.push(
							{
								item: createGroupResult(group.groupNode),
								selectable: true
							});
				}
			}
		}
	}
}

main();