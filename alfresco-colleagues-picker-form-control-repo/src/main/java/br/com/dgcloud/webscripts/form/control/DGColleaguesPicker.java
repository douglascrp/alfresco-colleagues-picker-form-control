package br.com.dgcloud.webscripts.form.control;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.alfresco.model.ContentModel;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.NodeService;
import org.alfresco.service.cmr.security.AuthenticationService;
import org.alfresco.service.cmr.security.AuthorityService;
import org.alfresco.service.cmr.security.PersonService;
import org.alfresco.service.cmr.site.SiteInfo;
import org.alfresco.service.cmr.site.SiteMemberInfo;
import org.alfresco.service.cmr.site.SiteService;
import org.alfresco.service.namespace.QName;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.json.simple.JSONObject;
import org.springframework.extensions.webscripts.Cache;
import org.springframework.extensions.webscripts.DeclarativeWebScript;
import org.springframework.extensions.webscripts.Status;
import org.springframework.extensions.webscripts.WebScriptRequest;

public class DGColleaguesPicker extends DeclarativeWebScript {

	private static Log logger = LogFactory.getLog(DGColleaguesPicker.class);

	private SiteService siteService;
	private PersonService personService;
	private NodeService nodeService;
	private AuthenticationService authenticationService;
	private AuthorityService authorityService;

	public void setSiteService(SiteService siteService) {
		this.siteService = siteService;
	}

	public void setPersonService(PersonService personService) {
		this.personService = personService;
	}

	public void setNodeService(NodeService nodeService) {
		this.nodeService = nodeService;
	}

	public void setAuthenticationService(
			AuthenticationService authenticationService) {
		this.authenticationService = authenticationService;
	}

	public void setAuthorityService(AuthorityService authorityService) {
		this.authorityService = authorityService;
	}

	@Override
	protected Map<String, Object> executeImpl(WebScriptRequest req,
			Status status, Cache cache) {
		String argsSelectableType = req.getParameter("selectableType");
		String argsSearchTerm = req.getParameter("searchTerm");
		String argsMaxResults = req.getParameter("size");

		Map<String, Object> model = new HashMap<String, Object>();

		List<JSONObject> results = null;

		if (argsSelectableType.equals("cm:person")) {
			results = findColleaguesUsers(argsSearchTerm, argsMaxResults,
					authenticationService.getCurrentUserName());
		} else if (argsSelectableType.equals("cm:authorityContainer")) {
			results = findColleaguesGroups(argsSearchTerm, argsMaxResults,
					authenticationService.getCurrentUserName());
		}

		model.put("results", results);

		return model;
	}

	@SuppressWarnings("unchecked")
	private List<JSONObject> findColleaguesUsers(String filterTerm,
			String maxResults, String loggedinUserName) {
		List<JSONObject> results = new ArrayList<JSONObject>();

		List<SiteInfo> sites = siteService.listSites(loggedinUserName);

		List<String> addedMembers = new ArrayList<String>();

		for (SiteInfo site : sites) {
			// Alteração para eliminar gargalo no filtro
			// if (filterTerm != null && !filterTerm.equals("")) {
			// filterTerm = "*" + filterTerm + "*";
			// }

			// List<SiteMemberInfo> members = siteService.listMembersInfo(
			// site.getShortName(), filterTerm, null, 0, true);

			// Recupera todos os usuários
			List<SiteMemberInfo> members = siteService.listMembersInfo(
					site.getShortName(), null, null, 0, true);

			for (SiteMemberInfo member : members) {
				if (filterTerm != null && !filterTerm.equals("")) {

					// Recupera valores e converte tudo para minúsculo
					filterTerm = filterTerm.toLowerCase();
					String memberName = member.getMemberName().toLowerCase();

					NodeRef person = personService.getPerson(member
							.getMemberName());

					Map<QName, Serializable> personProperties = nodeService
							.getProperties(person);

					String userName = personProperties
							.get(ContentModel.PROP_USERNAME) != null ? personProperties
							.get(ContentModel.PROP_USERNAME).toString()
							.toLowerCase()
							: "";
					String firstName = personProperties
							.get(ContentModel.PROP_FIRSTNAME) != null ? personProperties
							.get(ContentModel.PROP_FIRSTNAME).toString()
							.toLowerCase()
							: "";
					String lastName = personProperties
							.get(ContentModel.PROP_LASTNAME) != null ? personProperties
							.get(ContentModel.PROP_LASTNAME).toString()
							.toLowerCase()
							: "";

					if (logger.isDebugEnabled()) {
						logger.debug("filterTerm = " + filterTerm);
						logger.debug("memberName = " + memberName);
						logger.debug("userName = " + userName);
						logger.debug("firstName = " + firstName);
						logger.debug("lastName = " + lastName);
					}

					// Filtra via código para eliminar gargalo do filtro da api
					if ((memberName.contains(filterTerm))
							|| (userName.contains(filterTerm))
							|| (firstName.contains(filterTerm))
							|| (lastName.contains(filterTerm))) {

						if (!addedMembers.contains(member.getMemberName())) {

							addedMembers.add(member.getMemberName());

							JSONObject obj = new JSONObject();
							obj.put("item",
									createPersonResult(person, personProperties));
							obj.put("selectable", true);

							results.add(obj);
						}
					}
				}
			}
		}

		return results;
	}

	@SuppressWarnings("unchecked")
	private List<JSONObject> findColleaguesGroups(String filterTerm,
			String maxResults, String loggedinUserName) {
		List<JSONObject> results = new ArrayList<JSONObject>();

		List<SiteInfo> sites = siteService.listSites(loggedinUserName);

		List<String> addedMembers = new ArrayList<String>();

		for (SiteInfo site : sites) {
			// Alteração para eliminar gargalo no filtro
			// if (filterTerm != null && !filterTerm.equals("")) {
			// filterTerm = "*" + filterTerm + "*";
			// }

			// List<SiteMemberInfo> members = siteService.listMembersInfo(
			// site.getShortName(), filterTerm, null, 0, false);

			// Recupera todos os membros
			List<SiteMemberInfo> members = siteService.listMembersInfo(
					site.getShortName(), null, null, 0, false);

			for (SiteMemberInfo member : members) {
				if (filterTerm != null && !filterTerm.equals("")) {

					if (member.getMemberName().startsWith("GROUP_")) {

						NodeRef group = authorityService
								.getAuthorityNodeRef(member.getMemberName());

						Map<QName, Serializable> groupProperties = nodeService
								.getProperties(group);

						// Recupera valores e converte tudo para minúsculo
						String memberName = member.getMemberName().substring(6)
								.toLowerCase();

						String displayName = groupProperties
								.get(ContentModel.PROP_AUTHORITY_DISPLAY_NAME) != null ? groupProperties
								.get(ContentModel.PROP_AUTHORITY_DISPLAY_NAME)
								.toString().toLowerCase()
								: "";

						String authorityName = groupProperties
								.get(ContentModel.PROP_AUTHORITY_NAME) != null ? groupProperties
								.get(ContentModel.PROP_AUTHORITY_NAME)
								.toString().toLowerCase()
								: "";

						if (authorityName.startsWith("group_")) {
							authorityName = authorityName.substring(6);
						}

						filterTerm = filterTerm.toLowerCase();

						if (logger.isDebugEnabled()) {
							logger.debug("filterTerm = " + filterTerm);
							logger.debug("memberName = " + memberName);
							logger.debug("displayName = " + displayName);
							logger.debug("authorityName = " + authorityName);
						}

						// Filtra via código para eliminar gargalo do filtro da
						// api
						if ((memberName.contains(filterTerm))
								|| (displayName.contains(filterTerm))
								|| (authorityName.contains(filterTerm))) {

							if (!addedMembers.contains(member.getMemberName())) {
								addedMembers.add(member.getMemberName());

								JSONObject obj = new JSONObject();
								obj.put("item",
										createGroupResult(group,
												groupProperties));
								obj.put("selectable", true);

								results.add(obj);
							}
						}
					}
				}
			}
		}

		return results;
	}

	private Map<String, Object> createPersonResult(NodeRef person,
			Map<QName, Serializable> personProperties) {
		// build a json object
		Map<String, Object> personPropertiesObject = new HashMap<String, Object>();

		String userName = personProperties.get(ContentModel.PROP_USERNAME) != null ? personProperties
				.get(ContentModel.PROP_USERNAME).toString() : null;
		String firstName = personProperties.get(ContentModel.PROP_FIRSTNAME) != null ? personProperties
				.get(ContentModel.PROP_FIRSTNAME).toString() : null;
		String lastName = personProperties.get(ContentModel.PROP_LASTNAME) != null ? personProperties
				.get(ContentModel.PROP_LASTNAME).toString() : null;
		String jobTitle = personProperties.get(ContentModel.PROP_JOBTITLE) != null ? personProperties
				.get(ContentModel.PROP_JOBTITLE).toString() : null;

		personPropertiesObject.put("userName", userName);

		personPropertiesObject.put("name", (firstName != null ? firstName + " "
				: "")
				+ (lastName != null ? lastName : "")
				+ " ("
				+ userName
				+ ")");
		personPropertiesObject.put("jobtitle", (jobTitle != null ? jobTitle
				: ""));

		Map<String, Object> personObject = new HashMap<String, Object>();

		// put some data on it
		personObject.put("typeShort", "cm:person");
		personObject.put("isContainer", false);
		personObject.put("properties", personPropertiesObject);
		personObject.put("displayPath", "");
		personObject.put("nodeRef", person.toString());

		return personObject;
	}

	private Map<String, Object> createGroupResult(NodeRef group,
			Map<QName, Serializable> groupProperties) {
		// build a json object
		Map<String, Object> groupPropertiesObject = new HashMap<String, Object>();

		Map<String, Object> groupObject = new HashMap<String, Object>();

		String name = groupProperties
				.get(ContentModel.PROP_AUTHORITY_DISPLAY_NAME) != null ? groupProperties
				.get(ContentModel.PROP_AUTHORITY_DISPLAY_NAME).toString()
				: null;

		if (name == null || name.length() == 0) {
			name = groupProperties.get(ContentModel.PROP_AUTHORITY_NAME) != null ? groupProperties
					.get(ContentModel.PROP_AUTHORITY_NAME).toString() : null;

			if (name != null && name.startsWith("GROUP_")) {
				name = name.substring(6);
			} else {
				return groupObject;
			}
		}

		groupPropertiesObject.put("name", name);

		// put some data on it
		groupObject.put("typeShort", "cm:group");
		groupObject.put("isContainer", false);
		groupObject.put("properties", groupPropertiesObject);
		groupObject.put("displayPath", "");
		groupObject.put("nodeRef", group.toString());

		// build a JSON string and send it back
		return groupObject;
	}
}